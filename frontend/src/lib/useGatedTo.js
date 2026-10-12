import { useAuth } from "../contexts/AuthContext";

/** Logged-out visitors go through signup and come back to the page they asked for. */
export default function useGatedTo() {
  const { user } = useAuth();
  return (to) => (user ? to : `/signup?next=${encodeURIComponent(to)}`);
}
