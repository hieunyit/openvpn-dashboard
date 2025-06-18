
// Since the main dashboard page also has a loading.tsx, 
// and this is a sub-page, we might not need a specific loading UI here
// if the parent layout's Suspense handles it adequately.
// For now, returning null is fine.
// If specific skeleton for this page is needed, implement it here.
export default function Loading() {
  return null;
}
