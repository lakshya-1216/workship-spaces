import { Navigate, createFileRoute } from "@tanstack/react-router";
import { HostProtectedRoute } from "@/components/HostProtectedRoute";

export const Route = createFileRoute("/add-listing")({
  head: () => ({ meta: [{ title: "Add Listing - Workship" }] }),
  component: AddListingAliasPage,
});

function AddListingAliasPage() {
  return (
    <HostProtectedRoute>
      <Navigate to="/host-add-listing" replace />
    </HostProtectedRoute>
  );
}
