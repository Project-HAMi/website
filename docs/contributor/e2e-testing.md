---
id: e2e-testing
title: End-to-End Testing
sidebar_label: E2E Testing
---

# End-to-End Testing

## Summary

This document proposes End-to-End (E2E) testing support for HAMi, ensuring its functionality and compatibility within the Kubernetes ecosystem. It introduces mechanisms to validate the entire workflow and guarantees that the system meets production-level requirements.

## Motivation

E2E tests validate the complete functionality of a system, ensuring that the end-user experience aligns with developer specifications.

While unit and integration tests provide valuable feedback, they are often insufficient in distributed systems. Minor changes may pass unit and integration tests but still introduce unforeseen issues at the system level.

Comprehensive E2E test coverage is essential to mitigate the risks of regressions, improve reliability, and maintain confidence in the system's seamless integration with Kubernetes.

### Goals

- Set up the E2E testing basic environment.
- Define the scope and scenarios for E2E testing of HAMi.
- Implement E2E tests that cover key workflows and edge cases.
- Ensure compatibility with Kubernetes.
- Establish a reliable and repeatable test framework for future enhancements.

### Non-Goals

- Unit or integration testing of individual features (covered elsewhere).
- Performance benchmarking beyond basic scenarios.

## Proposal

### Test Scope

- **Core functionality:** Validate basic operations and workflows.
- **Edge cases:** Test unusual scenarios or invalid inputs to ensure robustness.
- **Compatibility:**
  - Verify integration with different heterogeneous devices.
  - Verify integration with different Kubernetes versions.
  - Verify integration with different CUDA versions (optional).
- **Error handling:** Ensure appropriate error messages and recovery mechanisms are in place.

### Implementation Details

- Tests run in a local environment.
- Tests are written using the [Ginkgo](https://onsi.github.io/ginkgo/) framework.
- All tests use isolated namespaces to avoid conflicts.
- Resource cleanup is automated after each test run.
- CI integration ensures tests run against PRs, daily builds, and releases.

### User Stories

**Story 1:** Automating E2E testing with Helm deployment.

**Story 2:** Automating E2E testing with resource validation.

**Story 3:** Automating E2E testing with Kubernetes resource deployment.

## Risks and Mitigations

**Resource Limitations**

Testing clusters may encounter resource constraints such as insufficient CPU, memory, or storage. This can lead to test failures, degraded performance, or timeouts during deployments.

**Environment Instability**

Instabilities such as network latency, intermittent failures, or cluster node failures can cause tests to fail or behave inconsistently. Tests should be designed to retry on transient errors and report deterministically on persistent ones.
