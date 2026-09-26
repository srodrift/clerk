import Knot from "./knot";
export default function Page() {
  return <Knot liveAvailable={Boolean(process.env.TYPESAFE_API_KEY?.trim())} />;
}
export const dynamic = "force-dynamic";
