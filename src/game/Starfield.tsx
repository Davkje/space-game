import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type BufferAttribute, type BufferGeometry } from "three";
import { CAMERA_DISTANCE, STAR_COUNT, STAR_SPEED } from "./constants";

/*
  Starfield – tusentals stjärnor som susar förbi och ger känslan av fart.

  ── Points i stället för Meshes ──
  2000 små sfärer (meshes) vore onödigt tungt. I stället använder vi
  THREE.Points: EN geometri med 2000 punkter, som ritas som små fyrkanter
  i ett enda anrop till grafikkortet ("draw call"). Väldigt billigt!

  ── BufferGeometry och BufferAttribute ──
  All geometri i three.js är i grunden en BufferGeometry: en samling
  långa listor med siffror ("attribut") som skickas till grafikkortet.
  Det viktigaste attributet heter "position" och är en platt lista:

    [x0, y0, z0,  x1, y1, z1,  x2, y2, z2, ...]

  Alltså 3 siffror per punkt (därför `itemSize` 3 nedan). Vi använder en
  Float32Array – en snabb array med bara decimaltal, som grafikkortet
  förstår direkt.

  ── Tricket: stjärnorna står inte stilla ──
  Precis som asteroiderna flyttar vi stjärnorna MOT kameran (+z). När en
  stjärna passerat kameran flyttar vi den längst bort igen. Så återanvänds
  samma 2000 stjärnor i all evighet.
*/

/** Stjärnfältets utbredning: bredd (x), höjd (y), och z-intervall. */
const SPREAD_X = 160;
const SPREAD_Y = 100;
const FAR_Z = -250;
const NEAR_Z = CAMERA_DISTANCE + 2; // strax bakom kameran

/** Skapar en slumpmässig position (x, y, z) för varje stjärna. */
function createStarPositions() {
	const positions = new Float32Array(STAR_COUNT * 3);
	for (let i = 0; i < STAR_COUNT; i++) {
		// randFloatSpread(n) ger ett slumptal mellan -n/2 och n/2
		positions[i * 3 + 0] = MathUtils.randFloatSpread(SPREAD_X); // x
		positions[i * 3 + 1] = MathUtils.randFloatSpread(SPREAD_Y); // y
		positions[i * 3 + 2] = MathUtils.randFloat(FAR_Z, NEAR_Z); // z
	}
	return positions;
}

export function Starfield() {
	const geometryRef = useRef<BufferGeometry>(null);

	/*
	  useMemo med tom beroende-lista: positionerna skapas EN gång. Utan
	  useMemo skulle vi slumpa fram nya 2000 stjärnor varje gång
	  komponenten renderas.
	*/
	const positions = useMemo(() => createStarPositions(), []);

	useFrame((_state, delta) => {
		const geometry = geometryRef.current;
		if (!geometry) return;

		const attribute = geometry.attributes.position as BufferAttribute;
		const array = attribute.array as Float32Array;

		for (let i = 0; i < STAR_COUNT; i++) {
			// Index för stjärnans z-värde i den platta listan
			const zIndex = i * 3 + 2;
			array[zIndex] += STAR_SPEED * delta;

			// Har stjärnan passerat kameran? Flytta den längst bort igen.
			if (array[zIndex] > NEAR_Z) {
				array[zIndex] -= NEAR_Z - FAR_Z;
			}
		}

		/*
		  VIKTIGT: Grafikkortet har en egen kopia av listan. needsUpdate
		  säger åt three.js att skicka över den nya versionen inför nästa
		  bild. Glömmer man det står stjärnorna still!
		*/
		attribute.needsUpdate = true;
	});

	return (
		<points>
			<bufferGeometry ref={geometryRef}>
				{/*
				  attach="attributes-position" betyder:
				    geometry.attributes.position = new THREE.BufferAttribute(positions, 3)
				  (bindestrecket i attach = en punkt, ett steg djupare in i objektet)
				*/}
				<bufferAttribute attach="attributes-position" args={[positions, 3]} />
			</bufferGeometry>

			{/*
			  pointsMaterial ritar varje punkt som en liten fyrkant.
			  - size: storlek på varje punkt
			  - sizeAttenuation: punkter längre bort blir mindre (perspektiv)
			  - fog={false}: stjärnorna ska INTE försvinna i dimman (se Scene.tsx),
			    de är ju jättelångt bort i "verkligheten".
			*/}
			<pointsMaterial color="#ffffff" size={0.15} sizeAttenuation fog={false} />
		</points>
	);
}
