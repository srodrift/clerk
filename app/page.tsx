import Unsent from "./unsent";
export default function Page() {
  return (
    <Unsent liveAvailable={Boolean(process.env.TYPESAFE_API_KEY?.trim())} />
  );
}
export const dynamic = "force-dynamic";
