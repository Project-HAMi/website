#include <cuda_runtime.h>

#include <chrono>
#include <cstdlib>
#include <iostream>
#include <thread>

int main() {
  constexpr size_t GiB = 1024ULL * 1024ULL * 1024ULL;
  void *within_limit = nullptr;
  void *over_limit = nullptr;

  cudaError_t first = cudaMalloc(&within_limit, 3 * GiB);
  std::cout << "allocate 3 GiB: " << cudaGetErrorString(first) << std::endl;
  if (first != cudaSuccess) return 1;

  cudaError_t second = cudaMalloc(&over_limit, 2 * GiB);
  std::cout << "allocate another 2 GiB: " << cudaGetErrorString(second)
            << std::endl;
  if (second == cudaSuccess) {
    std::cerr << "ERROR: allocation exceeded the container quota" << std::endl;
    cudaFree(over_limit);
    cudaFree(within_limit);
    return 2;
  }
  if (second != cudaErrorMemoryAllocation) {
    std::cerr << "ERROR: expected out of memory, got "
              << cudaGetErrorString(second) << std::endl;
    cudaFree(within_limit);
    return 3;
  }

  const char *hold = std::getenv("HOLD_SECONDS");
  if (hold) {
    std::this_thread::sleep_for(std::chrono::seconds(std::atoi(hold)));
  }

  cudaFree(within_limit);
  std::cout
      << "PASS: in-quota allocation succeeded and over-quota allocation failed"
      << std::endl;
  return 0;
}
