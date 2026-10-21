import type { Branch } from "@presqio/lib";
import { Icon } from "@/components/icon";
import { Caption, Center, Diagram, RadiusLabel, Ring } from "./GeofencePreview.style";
export function GeofencePreview({ branch }: { branch: Branch }) {
  return (
    <Diagram aria-label={`Illustrative geofence with ${branch.radius} meter radius`}>
      <Ring>
        <Center>
          <Icon name="map" />
        </Center>
        <RadiusLabel>{branch.radius} m</RadiusLabel>
      </Ring>
      <Caption>Perimeter illustration</Caption>
    </Diagram>
  );
}
