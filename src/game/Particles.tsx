import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { PARTICLE_LIFETIME } from "./constants";
import { moveParticles, PARTICLE_POOL_SIZE, type Particle } from "./world";

/*
  Particles – skärvorna som flyger när stenar spricker och går sönder,
  och gnistorna när man plockar upp en kristall.

  Den här komponenten SKAPAR inga partiklar själv – det gör GameLogic.tsx
  med emitParticles() (se world.ts) när något träffas. Här ser vi bara
  till att poolens meshes finns, och flyttar partiklarna varje frame.

  Till skillnad från asteroiderna fortsätter partiklarna röra sig även
  när spelet är slut, så att sista explosionen hinner bli klar.
*/

type ParticlesProps = {
	particlesRef: RefObject<Particle[]>;
};

export function Particles({ particlesRef }: ParticlesProps) {
	useFrame((_state, delta) => {
		moveParticles(particlesRef.current, delta, PARTICLE_LIFETIME);
	});

	// Samma pool-teknik som i Asteroids.tsx.
	return (
		<>
			{Array.from({ length: PARTICLE_POOL_SIZE }, (_, i) => (
				<mesh
					key={i}
					ref={(mesh) => {
						particlesRef.current[i].mesh = mesh;
						if (mesh) mesh.visible = false;
					}}
				/>
			))}
		</>
	);
}
