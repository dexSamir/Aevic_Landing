import "../../app/workspaceStyles";

export function formatDate(value: string) {
  return new Date(value).toLocaleString("az-AZ", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
