import GaragePageClient from "@/components/pages/garage/GaragePageClient";
import { LOTS } from "@/lib/constants/sjsu";

export async function generateMetadata({ params }) {
  const { lot_id } = await params;
  return { title: `${Object.hasOwn(LOTS, lot_id) ? LOTS[lot_id] : "Garage"} · sPARK` };
}

export default async function GaragePage({ params }) {
  const { location_id, lot_id } = await params;
  return <GaragePageClient locationId={location_id.toLowerCase()} lotId={lot_id} />;
}
