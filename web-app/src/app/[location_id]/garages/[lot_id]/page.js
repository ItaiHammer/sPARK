import GaragePageClient from "@/components/pages/garage/GaragePageClient";
import { LOTS } from "@/lib/constants/sjsu";

export async function generateMetadata({ params }, parent) {
  const { lot_id } = await params;
  const garageName = Object.hasOwn(LOTS, lot_id) ? LOTS[lot_id] : "Garage";
  const { openGraph } = await parent;

  return {
    title: `${garageName} · sPARK`,
    openGraph: {
      ...openGraph,
      title: `${garageName} - sPARK`,
      description: "Parking forecasts for SJSU parking lots. Built and maintained by a student, independent of San Jose State University.",
    },
  };
}

export default async function GaragePage({ params }) {
  const { location_id, lot_id } = await params;
  return <GaragePageClient locationId={location_id.toLowerCase()} lotId={lot_id} />;
}
