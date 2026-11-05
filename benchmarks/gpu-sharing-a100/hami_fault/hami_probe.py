"""Verify actual HAMi hook resolution and memory enforcement in a test pod."""
import ctypes as C
import json
import os
from agent import Driver,inspect_hami

d=Driver();d.call("cuInit",0)
dev=C.c_int();ctx=C.c_void_p();d.call("cuDeviceGet",C.byref(dev),0)
d.call("cuCtxCreate_v2",C.byref(ctx),0,dev)
total=C.c_size_t();d.call("cuDeviceTotalMem_v2",C.byref(total),dev)
proof=inspect_hami(d)
proof.update({"uid":os.getuid(),"reported_memory_total":total.value,"env":{k:v for k,v in os.environ.items() if k.startswith(("CUDA_DEVICE","CUDA_MPS","GPU_CORE","NVIDIA_VISIBLE","LD_PRELOAD"))}})
large=C.c_uint64()
rc=d.call("cuMemAlloc_v2",C.byref(large),21*1024**3,check=False)
proof["quota_probe"]={"requested_bytes":21*1024**3,"cuda_result":rc,"error_name":d.name(rc)}
if rc==0:d.call("cuMemFree_v2",large)
proof["context_destroy_result"]=d.call("cuCtxDestroy_v2",ctx,check=False)
print(json.dumps(proof))
