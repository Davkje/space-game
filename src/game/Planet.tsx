import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";

/*
  Planet – en stor planet med ring långt borta, bara för stämningen.

  Den rör sig aldrig mot oss (till skillnad från stjärnorna). Saker som är
  JÄTTELÅNGT bort ser ut att stå still även när man åker fort – som månen
  när man åker bil. Den kontrasten gör att fartkänslan blir ännu bättre.

  fog={false} på materialen: planeten ligger långt bortom dimman (se
  Scene.tsx) och skulle annars bli helt osynlig.
*/
export function Planet() {
	const groupRef = useRef<Group>(null);

	// Snurra planeten väldigt långsamt runt sin egen axel.
	useFrame((_state, delta) => {
		if (groupRef.current) groupRef.current.rotation.y += delta * 0.02;
	});

	return (
		// Uppe till vänster, långt bort. Den lilla lutningen (rotation.z)
		// gör att ringen ser mer naturlig ut.
		<group ref={groupRef} position={[-120, 45, -400]} rotation={[0, 0, 0.3]}>
			{/* Själva planeten. 64 segment = slät, rund kant även när den är stor. */}
			<mesh>
				<sphereGeometry args={[50, 64, 32]} />
				<meshStandardMaterial color="#7b5ea7" roughness={0.9} fog={false} />
			</mesh>

			{/*
			  Ringen: en torus (munkform) som tryckts ihop till nästan platt.
			  torusGeometry(radie, tjocklek, segment runt röret, segment runt ringen)
			  Vi roterar den så att den ligger nästan horisontellt.
			*/}
			<mesh rotation={[Math.PI / 2.2, 0, 0]} scale={[1, 1, 0.1]}>
				<torusGeometry args={[80, 8, 2, 96]} />
				<meshStandardMaterial color="#c9a96e" roughness={0.8} fog={false} />
			</mesh>
		</group>
	);
}
