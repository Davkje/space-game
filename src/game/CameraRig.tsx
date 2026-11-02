import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import { CAMERA_DISTANCE, CAMERA_FOLLOW, CAMERA_HEIGHT } from "./constants";

/*
  CameraRig – låter kameran följa skeppet mjukt.

  Ett "camera rig" är filmbranschens ord för stativet/kranen som kameran
  sitter på. Här är det en komponent som inte ritar något alls (den
  returnerar null) – den finns bara för att få köra kod i useFrame.

  ── state.camera ──
  useFrame får ett `state`-objekt som första argument. Där finns allt R3F
  håller koll på: state.camera, state.scene, state.clock, state.size osv.
  state.camera är samma kamera som vi konfigurerade i <Canvas> i App.tsx.
*/

type CameraRigProps = {
	shipRef: RefObject<Group | null>;
};

export function CameraRig({ shipRef }: CameraRigProps) {
	useFrame((state, delta) => {
		const ship = shipRef.current;
		if (!ship) return;

		const camera = state.camera;

		/*
		  Var vill vi att kameran ska vara? Bakom och lite ovanför skeppet,
		  men den följer bara med till hälften (CAMERA_FOLLOW = 0.5) i sidled
		  och höjdled. Annars skulle skeppet alltid stå still mitt på skärmen
		  och det skulle kännas som att världen rörde sig i stället.
		*/
		const targetX = ship.position.x * CAMERA_FOLLOW;
		const targetY = CAMERA_HEIGHT + ship.position.y * CAMERA_FOLLOW;

		/*
		  Glid mot målet med damp (samma teknik som skeppets hastighet).
		  Lambda 3 är lite lägre än skeppets acceleration, så kameran
		  "släpar efter" en aning – det ger en känsla av tyngd och fart.
		*/
		camera.position.x = MathUtils.damp(camera.position.x, targetX, 3, delta);
		camera.position.y = MathUtils.damp(camera.position.y, targetY, 3, delta);
		camera.position.z = CAMERA_DISTANCE;

		/*
		  lookAt(x, y, z) vrider kameran så att den tittar mot en punkt.
		  Vi tittar rakt framåt, långt bort (z = -20), och lite nedåt (-1)
		  så att skeppet hamnar i nedre delen av bilden – som i de flesta
		  rymdspel – och vi ser mer av det som kommer emot oss.
		*/
		camera.lookAt(camera.position.x, camera.position.y - 1, -20);
	});

	return null;
}
