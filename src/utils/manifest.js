export function formatPodManifest(vendor, annotations, limits) {
  const podName = `hami-${vendor.toLowerCase().replace(/_/g, "-")}-pod`;
  let code = `apiVersion: v1
kind: Pod
metadata:
  name: ${podName}
`;
  if (annotations.length > 0) {
    code += `  annotations:\n${annotations.join("\n")}\n`;
  }
  code += `spec:\n`;
  if (vendor.startsWith("ASCEND_")) {
    // The Ascend runtime class is optional and its name is configurable.
    code += `  # runtimeClassName: ascend  # enable if your cluster uses the Ascend runtime class\n`;
  }
  code += `  containers:
    - name: hami-container
      image: ubuntu:22.04
      command: ["sleep", "infinity"]
      resources:
        limits:
${limits.map((limit) => `          ${limit}`).join("\n")}`;
  return code;
}
