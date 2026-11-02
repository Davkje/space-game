import { useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import {
	SHIP_ACCELERATION,
	SHIP_BOUNDS,
	SHIP_MAX_BANK,
	SHIP_MAX_PITCH,
	SHIP_MAX_SPEED,
} from "./constants";
import { isInvulnerable, useGameStore } from "./gameStore";
import { useKeyboard } from "./useKeyboard";

/*
  Ship – spelarens rymdskepp.

  ── Uppbyggnad: en Group med flera Meshes ──
  Skeppet är byggt av enkla former (kon, boxar, sfär). För att kunna flytta
  och rotera ALLT på en gång lägger vi delarna i en <group>
  (= new THREE.Group()).

  En group är ett osynligt "paket". Barnens position och rotation är
  RELATIVA till gruppen. Flyttar vi gruppen 2 enheter åt höger följer alla
  delar med, och vingarna sitter kvar på samma ställe relativt kroppen.
  Det kallas för en "scene graph" – ett träd av objekt där varje objekt
  ärver sin förälders position/rotation/skala.

  ── Riktning ──
  Skeppet ska peka "in i skärmen", alltså mot NEGATIV Z (se Scene.tsx).
*/

type ShipProps = {
	/*
	  Ref till skeppets group. Den skapas i Scene.tsx (föräldern) och skickas
	  hit, så att ANDRA komponenter (t.ex. CameraRig) också kan läsa var
	  skeppet befinner sig. Senare kommer kollisionskollen behöva den också.
	*/
	shipRef: RefObject<Group | null>;
};

export function Ship({ shipRef }: ShipProps) {
	const controls = useKeyboard();

	/*
	  Skeppets nuvarande hastighet (enheter per sekund) i x och y.
	  Ett vanligt objekt i en ref – det ändras varje frame, så det ska
	  inte ligga i useState.
	*/
	const velocity = useRef({ x: 0, y: 0 });

	useFrame((_state, delta) => {
		const ship = shipRef.current;
		if (!ship) return;

		const game = useGameStore.getState();
		// Man får styra både i startmenyn och under rundan, men inte när det är slut.
		const canSteer = game.phase === "ready" || game.phase === "playing";

		/*
		  0. SYNLIGHET
		  - Förlorat: skeppet är förstört, göm det.
		  - Osårbart efter en krock: blinka. elapsed * 10 räknar upp 10 gånger
		    per sekund; Math.floor(...) % 2 växlar då mellan 0 och 1 → skeppet
		    syns var tionde sekund och är gömt var tionde.
		*/
		if (game.phase === "lost") {
			ship.visible = false;
		} else if (isInvulnerable(game)) {
			ship.visible = Math.floor(game.elapsed * 10) % 2 === 0;
		} else {
			ship.visible = true;
		}

		const input = controls.current;
		const vel = velocity.current;

		/*
		  1. RIKTNING från tangenterna: -1, 0 eller 1.
		  Number(true) = 1, Number(false) = 0. Så om bara höger är nedtryckt:
		  1 - 0 = 1. Bara vänster: 0 - 1 = -1. Båda eller ingen: 0.
		  När spelet är slut ignorerar vi tangenterna – skeppet glider till stopp.
		*/
		const dirX = canSteer ? Number(input.right) - Number(input.left) : 0;
		const dirY = canSteer ? Number(input.up) - Number(input.down) : 0;

		/*
		  START: Står vi i startmenyn och spelaren börjar styra? Då drar
		  rundan igång (asteroider och timer startar, se gameStore.ts).
		*/
		if (game.phase === "ready" && (dirX !== 0 || dirY !== 0)) {
			game.start();
		}

		/*
		  2. HASTIGHET – mjukt mot målet.
		  Om vi satte vel.x = dirX * SHIP_MAX_SPEED direkt skulle skeppet
		  starta och stanna tvärt, som en robot. I stället "glider" vi
		  hastigheten mot målvärdet.

		  MathUtils.damp(nuvarande, mål, lambda, delta) flyttar
		  `nuvarande` en bit närmare `mål` varje frame. Den är som lerp
		  (linjär interpolation), men tar hänsyn till delta – så att
		  glidningen blir lika snabb oavsett bildfrekvens.
		*/
		vel.x = MathUtils.damp(vel.x, dirX * SHIP_MAX_SPEED, SHIP_ACCELERATION, delta);
		vel.y = MathUtils.damp(vel.y, dirY * SHIP_MAX_SPEED, SHIP_ACCELERATION, delta);

		/*
		  3. POSITION – flytta skeppet.
		  Klassisk fysik: sträcka = hastighet × tid.
		  (8 enheter/sek × 0.0166 sek ≈ 0.13 enheter denna frame.)
		*/
		ship.position.x += vel.x * delta;
		ship.position.y += vel.y * delta;

		/*
		  4. GRÄNSER – håll skeppet inom rutan.
		  clamp(värde, min, max) ser till att värdet aldrig hamnar utanför
		  [min, max].
		*/
		ship.position.x = MathUtils.clamp(ship.position.x, -SHIP_BOUNDS.x, SHIP_BOUNDS.x);
		ship.position.y = MathUtils.clamp(ship.position.y, -SHIP_BOUNDS.y, SHIP_BOUNDS.y);

		/*
		  5. LUTNING – får skeppet att kännas levande.
		  vel.x / SHIP_MAX_SPEED ger ett tal mellan -1 och 1 ("hur fort åker
		  vi i sidled, i procent av max"). Det gånger maxvinkeln = lutningen.

		  rotation.z = rulla runt nos-axeln (bank). Positiv z-rotation lutar
		  åt VÄNSTER, så vi tar minus: åker vi åt höger lutar vi åt höger.

		  rotation.x = tippa nosen upp/ner (pitch). Positiv x-rotation lyfter
		  en nos som pekar mot -Z, så åker vi uppåt pekar nosen uppåt.

		  Eftersom lutningen baseras på den MJUKA hastigheten blir även
		  lutningen mjuk – helt gratis!
		*/
		ship.rotation.z = -(vel.x / SHIP_MAX_SPEED) * SHIP_MAX_BANK;
		ship.rotation.x = (vel.y / SHIP_MAX_SPEED) * SHIP_MAX_PITCH;
	});

	return (
		<group ref={shipRef}>
			{/*
			  ── Kropp ──
			  coneGeometry(radie, höjd, antal sidor) pekar som standard UPPÅT
			  (+Y). Vi roterar den -90° (−π/2) runt X-axeln så att spetsen
			  pekar framåt mot −Z.

			  flatShading: varje triangel får en enda färgton i stället för
			  mjuka övergångar. Ger en snygg "low poly"-stil. Prova att ta
			  bort den och jämför!

			  metalness/roughness styr hur metallisk och hur blank ytan är
			  (0–1). Hög metalness + låg roughness = blank metall.
			*/}
			<mesh rotation={[-Math.PI / 2, 0, 0]}>
				<coneGeometry args={[0.4, 1.8, 8]} />
				<meshStandardMaterial color="#bcc1ef" metalness={0.6} roughness={0.35} flatShading />
			</mesh>

			{/*
			  ── Vingar ──
			  En platt, bred box: 2.4 bred (x), 0.06 tjock (y), 0.6 djup (z).
			  Flyttad lite bakåt (+z) så att de sitter på bakre delen av kroppen.
			*/}
			<mesh position={[0, 0, 0.35]}>
				<boxGeometry args={[2.4, 0.06, 0.6]} />
				<meshStandardMaterial color="#4fc3f7" metalness={0.3} roughness={0.5} />
			</mesh>

			{/*
			  ── Vingspetsar ──
			  Två små stående fenor, en på varje sida. Samma geometri, olika
			  position: x = -1.2 (vänster) och x = 1.2 (höger).
			*/}
			<mesh position={[-1.2, 0.15, 0.4]}>
				<boxGeometry args={[0.06, 0.35, 0.5]} />
				<meshStandardMaterial color="#ff6b9d" />
			</mesh>
			<mesh position={[1.2, 0.15, 0.4]}>
				<boxGeometry args={[0.06, 0.35, 0.5]} />
				<meshStandardMaterial color="#ff6b9d" />
			</mesh>

			{/*
			  ── Cockpit ──
			  sphereGeometry(radie, segment runt, segment uppifrån och ner).
			  Fler segment = rundare men tyngre att rita. `scale` med olika
			  värden per axel trycker ihop sfären till en avlång "droppe".
			*/}
			<mesh position={[0, 0.2, -0.1]} scale={[1, 0.7, 1.6]}>
				<sphereGeometry args={[0.2, 16, 12]} />
				<meshStandardMaterial color="#7490be" metalness={0.6} roughness={0.1} />
			</mesh>

			{/*
			  ── Motor ──
			  meshBasicMaterial påverkas INTE av ljus – den har alltid exakt
			  sin färg. Det får motorn att se ut som att den lyser själv,
			  även på skuggsidan. Ett enkelt men effektivt trick!
			*/}
			<mesh position={[0, 0, 0.92]}>
				<sphereGeometry args={[0.2, 12, 8]} />
				<meshBasicMaterial color="#eeb45d" />
			</mesh>
		</group>
	);
}
