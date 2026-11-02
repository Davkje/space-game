import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { BoxGeometry, MeshBasicMaterial, type Group } from "three";
import { BULLET_MAX_Z, BULLET_SPEED, FIRE_COOLDOWN } from "./constants";
import { useGameStore } from "./gameStore";
import { useKeyboard } from "./useKeyboard";
import { BULLET_POOL_SIZE, moveBullets, type Bullet } from "./world";

/*
  Bullets – laserskotten. Fungerar precis som asteroiderna (en pool, se
  world.ts), fast tvärtom: de skapas vid skeppet och flyger BORT (−z).
*/

type BulletsProps = {
	bulletsRef: RefObject<Bullet[]>;
	shipRef: RefObject<Group | null>;
};

export function Bullets({ bulletsRef, shipRef }: BulletsProps) {
	/*
	  Ännu en useKeyboard. Varje anrop får sina egna event-lyssnare, så
	  Ship och Bullets påverkar inte varandra. (Man skulle också kunna
	  anropa den en gång i Scene och skicka ner resultatet som prop.)
	*/
	const controls = useKeyboard();

	// En tunn, avlång box som pekar framåt: 0.08 × 0.08 × 1.4.
	const geometry = useMemo(() => new BoxGeometry(0.08, 0.08, 1.4), []);
	// meshBasicMaterial = lyser alltid med full färg (som motorn på skeppet).
	const material = useMemo(() => new MeshBasicMaterial({ color: "#7cfffb" }), []);

	useEffect(() => {
		return () => {
			geometry.dispose();
			material.dispose();
		};
	}, [geometry, material]);

	/** Sekunder kvar tills vi får skjuta igen. */
	const cooldown = useRef(0);

	useFrame((_state, delta) => {
		if (useGameStore.getState().phase !== "playing") return;

		const bullets = bulletsRef.current;
		const ship = shipRef.current;
		cooldown.current -= delta;

		// ── 1. Skjut om mellanslag hålls in och vapnet har "laddat om" ──
		if (controls.current.fire && cooldown.current <= 0 && ship) {
			const free = bullets.find((bullet) => !bullet.active);
			if (free?.mesh) {
				// Starta strax framför skeppets nos.
				free.mesh.position.set(ship.position.x, ship.position.y, ship.position.z - 1.2);
				free.mesh.visible = true;
				free.active = true;
				cooldown.current = FIRE_COOLDOWN;
			}
		}

		// ── 2. Flytta skotten framåt (se world.ts) ──
		moveBullets(bullets, delta, BULLET_SPEED, BULLET_MAX_Z);
	});

	// Samma teknik som i Asteroids.tsx – alla meshes finns från början,
	// osynliga. Här kan vi ge dem geometri och material direkt som props.
	return (
		<>
			{Array.from({ length: BULLET_POOL_SIZE }, (_, i) => (
				<mesh
					key={i}
					geometry={geometry}
					material={material}
					ref={(mesh) => {
						bulletsRef.current[i].mesh = mesh;
						if (mesh) mesh.visible = false;
					}}
				/>
			))}
		</>
	);
}
