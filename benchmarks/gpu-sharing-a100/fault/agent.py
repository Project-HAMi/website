"""Bounded CUDA Driver API heartbeat and fault injector for disposable test pods."""
import argparse
import ctypes as C
import json
import os
from pathlib import Path
import sys
import time

PTX = r"""
.version 8.0
.target sm_80
.address_size 64
.visible .entry increment(.param .u64 ptr, .param .u32 count) {
 .reg .pred %p;
 .reg .b32 %r<6>;
 .reg .b64 %d<4>;
 ld.param.u64 %d0, [ptr];
 ld.param.u32 %r0, [count];
 mov.u32 %r1, %tid.x;
 mov.u32 %r2, %ctaid.x;
 mov.u32 %r3, %ntid.x;
 mad.lo.u32 %r1, %r2, %r3, %r1;
 setp.ge.u32 %p, %r1, %r0;
 @%p bra DONE;
 mul.wide.u32 %d1, %r1, 4;
 add.u64 %d2, %d0, %d1;
 ld.global.u32 %r4, [%d2];
 add.u32 %r5, %r4, 1;
 st.global.u32 [%d2], %r5;
 DONE: ret;
}
.visible .entry illegal_store(.param .u64 ptr) {
 .reg .b64 %d;
 .reg .b32 %r;
 ld.param.u64 %d, [ptr];
 mov.u32 %r, 1;
 st.volatile.global.u32 [%d], %r;
 ret;
}
.visible .entry trigger_trap() {
 trap;
 ret;
}
.visible .entry bounded_spin(.param .u64 duration) {
 .reg .b64 %t<4>;
 .reg .pred %p;
 ld.param.u64 %t0, [duration];
 mov.u64 %t1, %globaltimer;
 AGAIN:
 mov.u64 %t2, %globaltimer;
 sub.u64 %t3, %t2, %t1;
 setp.lt.u64 %p, %t3, %t0;
 @%p bra AGAIN;
 ret;
}
"""


class CUDAError(RuntimeError):
    def __init__(self, api, code, name):
        super().__init__(f"{api}: {code} {name}")
        self.api, self.code, self.name = api, code, name


class Driver:
    def __init__(self):
        self.lib = C.CDLL("libcuda.so.1")
        specs = {
            "cuInit": [C.c_uint], "cuDeviceGet": [C.POINTER(C.c_int), C.c_int],
            "cuDeviceGetAttribute": [C.POINTER(C.c_int), C.c_int, C.c_int],
            "cuDeviceTotalMem_v2": [C.POINTER(C.c_size_t), C.c_int],
            "cuCtxCreate_v2": [C.POINTER(C.c_void_p), C.c_uint, C.c_int],
            "cuCtxDestroy_v2": [C.c_void_p], "cuCtxSynchronize": [],
            "cuCtxGetId": [C.c_void_p, C.POINTER(C.c_uint64)],
            "cuMemAlloc_v2": [C.POINTER(C.c_uint64), C.c_size_t],
            "cuMemFree_v2": [C.c_uint64],
            "cuMemsetD32_v2": [C.c_uint64, C.c_uint, C.c_size_t],
            "cuMemcpyDtoH_v2": [C.c_void_p, C.c_uint64, C.c_size_t],
            "cuModuleLoadData": [C.POINTER(C.c_void_p), C.c_void_p],
            "cuModuleGetFunction": [C.POINTER(C.c_void_p), C.c_void_p, C.c_char_p],
            "cuLaunchKernel": [C.c_void_p] + [C.c_uint]*7 + [C.c_void_p, C.POINTER(C.c_void_p), C.POINTER(C.c_void_p)],
            "cuStreamCreate": [C.POINTER(C.c_void_p), C.c_uint],
            "cuStreamSynchronize": [C.c_void_p],
            "cuStreamBeginCapture_v2": [C.c_void_p, C.c_int],
            "cuStreamEndCapture": [C.c_void_p, C.POINTER(C.c_void_p)],
            "cuGraphInstantiateWithFlags": [C.POINTER(C.c_void_p), C.c_void_p, C.c_uint64],
            "cuGraphLaunch": [C.c_void_p, C.c_void_p],
            "cuGetErrorName": [C.c_int, C.POINTER(C.c_char_p)],
        }
        for name, args in specs.items():
            fn = getattr(self.lib, name, None)
            if fn is not None:
                fn.argtypes, fn.restype = args, C.c_int

    def name(self, code):
        out = C.c_char_p()
        self.lib.cuGetErrorName(code, C.byref(out))
        return out.value.decode() if out.value else str(code)

    def call(self, api, *args, check=True):
        rc = getattr(self.lib, api)(*args)
        if rc and check:
            raise CUDAError(api, rc, self.name(rc))
        return rc

    def launch(self, fn, args, stream=None, blocks=1, threads=1):
        params = (C.c_void_p * len(args))(*[C.cast(C.byref(a), C.c_void_p) for a in args]) if args else None
        return self.call("cuLaunchKernel", fn, blocks, 1, 1, threads, 1, 1, 0, stream, params, None)


def run():
    p = argparse.ArgumentParser()
    p.add_argument("--role", choices=["victim", "attacker", "canary"], required=True)
    p.add_argument("--case", required=True)
    p.add_argument("--fault", required=True)
    a = p.parse_args()
    case = Path(a.case)
    output = (case / (a.role + ".jsonl")).open("x", buffering=1)

    def event(kind, **kwargs):
        row = {"event": kind, "role": a.role, "wall_ns": time.time_ns(), "mono_ns": time.monotonic_ns(), "pid": os.getpid(), **kwargs}
        output.write(json.dumps(row) + "\n")
        return row

    driver = Driver()
    context = C.c_void_p()
    try:
        driver.call("cuInit", 0)
        device = C.c_int()
        driver.call("cuDeviceGet", C.byref(device), 0)
        driver.call("cuCtxCreate_v2", C.byref(context), 0, device)
        sm = C.c_int()
        total = C.c_size_t()
        driver.call("cuDeviceGetAttribute", C.byref(sm), 16, device)
        driver.call("cuDeviceTotalMem_v2", C.byref(total), device)
        cid = C.c_uint64()
        cid_rc = driver.call("cuCtxGetId", context, C.byref(cid), check=False) if hasattr(driver.lib, "cuCtxGetId") else -1
        module = C.c_void_p()
        ptx = C.create_string_buffer(PTX.encode())
        driver.call("cuModuleLoadData", C.byref(module), C.cast(ptx, C.c_void_p))

        def function(name):
            out = C.c_void_p()
            driver.call("cuModuleGetFunction", C.byref(out), module, name.encode())
            return out

        functions = {name: function(name) for name in ["increment", "illegal_store", "trigger_trap", "bounded_spin"]}
        mem = C.c_uint64()
        count = C.c_uint(65536)
        driver.call("cuMemAlloc_v2", C.byref(mem), count.value * 4)
        driver.call("cuMemsetD32_v2", mem, 0, count.value)
        stream = C.c_void_p()
        driver.call("cuStreamCreate", C.byref(stream), 1)
        graph, executable = C.c_void_p(), C.c_void_p()
        if a.role != "attacker":
            driver.call("cuStreamBeginCapture_v2", stream, 0)
            driver.launch(functions["increment"], [mem, count], stream, blocks=256, threads=256)
            driver.call("cuStreamEndCapture", stream, C.byref(graph))
            driver.call("cuGraphInstantiateWithFlags", C.byref(executable), graph, 0)
        ready = event("ready", uid=os.getuid(), gpu_sm_count=sm.value, gpu_memory_total=total.value, cuda_context_id=cid.value if cid_rc == 0 else None, context_id_result=cid_rc,
                      cuda_graph=(a.role != "attacker"), env={k: v for k, v in os.environ.items() if k.startswith(("CUDA_MPS", "CUDA_VISIBLE", "NVIDIA_VISIBLE", "LD_PRELOAD"))})
        (case / (a.role + ".ready.json")).write_text(json.dumps(ready))
        if a.role == "attacker":
            deadline = time.monotonic() + 25
            while not (case / "trigger.json").exists():
                if time.monotonic() > deadline:
                    raise TimeoutError("No trigger within 25 seconds")
                time.sleep(.02)
            event("inject_begin", fault=a.fault)
            if a.fault == "oom":
                too_large = C.c_uint64()
                rc = driver.call("cuMemAlloc_v2", C.byref(too_large), total.value * 2, check=False)
                event("injected", fault=a.fault, api="cuMemAlloc_v2", result=rc, error_name=driver.name(rc), allocation_bytes=total.value*2)
                if rc == 0:
                    driver.call("cuMemFree_v2", too_large)
                    raise AssertionError("Expected allocation failure, got success")
            elif a.fault == "illegal_address":
                driver.launch(functions["illegal_store"], [C.c_uint64(0)], stream)
                rc = driver.call("cuStreamSynchronize", stream, check=False)
                event("injected", fault=a.fault, api="cuStreamSynchronize", result=rc, error_name=driver.name(rc))
                assert rc != 0, "Illegal store failed to trigger a CUDA error"
            elif a.fault == "trap":
                driver.launch(functions["trigger_trap"], [], stream)
                rc = driver.call("cuStreamSynchronize", stream, check=False)
                event("injected", fault=a.fault, api="cuStreamSynchronize", result=rc, error_name=driver.name(rc))
                assert rc != 0, "trap failed to trigger a CUDA error"
            elif a.fault in ("kill_busy", "terminate_busy"):
                duration = C.c_uint64(2_000_000_000)  # bounded 2 seconds; never an infinite kernel
                driver.launch(functions["bounded_spin"], [duration], stream, blocks=sm.value, threads=256)
                launched = event("busy_launched", kernel_max_duration_ms=2000)
                (case / "busy-launched.json").write_text(json.dumps(launched))
                rc = driver.call("cuStreamSynchronize", stream, check=False)
                event("busy_sync", result=rc, error_name=driver.name(rc))
                time.sleep(1)
            else:
                raise ValueError(a.fault)
            event("attacker_done")
        else:
            steps = 0
            deadline = time.monotonic() + 45
            while time.monotonic() < deadline and not (case / "stop.json").exists():
                start = time.monotonic_ns()
                try:
                    driver.call("cuGraphLaunch", executable, stream)
                    driver.call("cuStreamSynchronize", stream)
                    first, last = C.c_uint(), C.c_uint()
                    driver.call("cuMemcpyDtoH_v2", C.byref(first), mem, 4)
                    driver.call("cuMemcpyDtoH_v2", C.byref(last), mem.value + (count.value-1)*4, 4)
                    steps += 1
                    correct = first.value == last.value == steps
                    event("sample", ok=correct, steps=steps, first=first.value, last=last.value, latency_ms=(time.monotonic_ns()-start)/1e6)
                except CUDAError as exc:
                    event("sample", ok=False, api=exc.api, result=exc.code, error_name=exc.name, latency_ms=(time.monotonic_ns()-start)/1e6)
                time.sleep(.05)
            event("heartbeat_done", steps=steps)
        rc = driver.call("cuCtxDestroy_v2", context, check=False)
        context = C.c_void_p()
        event("context_destroy", result=rc, error_name=driver.name(rc))
    except Exception as exc:
        event("agent_error", error=str(exc), type=type(exc).__name__)
        raise
    finally:
        output.close()


if __name__ == "__main__":
    run()
