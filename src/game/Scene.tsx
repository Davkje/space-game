import { useRef } from "react";
import type { Group } from "three";
import { Asteroids } from "./Asteroids";
import { Bullets } from "./Bullets";
import { CameraRig } from "./CameraRig";
import { GameLogic } from "./GameLogic";
// import { Planet } from "./Planet";
import { Ship } from "./Ship";
import { Starfield } from "./Starfield";
import { Particles } from "./Particles";
import { createAsteroidPool, createBulletPool, createParticlePool } from "./world";

/** Bakgrundsfärgen – används både till bakgrund och dimma. */
const SPACE_COLOR = "#05050f";

/*
  Scene samlar allt som finns i vår 3D-värld: bakgrund, ljus och objekt.

  ── Koordinatsystemet i three.js ──
  three.js använder ett "högerhänt" koordinatsystem:
    X  → åt höger          (röd linje i axesHelper nedan)
    Y  → uppåt             (grön linje)
    Z  → MOT dig, ut ur skärmen (blå linje)

  Det betyder att "framåt in i skärmen" är NEGATIV Z. Det blir viktigt sen:
  asteroiderna kommer att skapas långt bort på t.ex. z = -200 och flyga
  mot oss (mot positiv z).

  ── JSX-taggar i R3F ──
  Varje gemen tagg här (<color>, <ambientLight>, <mesh> …) motsvarar en
  three.js-klass. R3F gör om namnet till PascalCase och kör `new` på den:
    <ambientLight />    →  new THREE.AmbientLight()
    <axesHelper />      →  new THREE.AxesHelper()
  och sedan scene.add(...) åt dig. Tar React bort taggen tas objektet bort
  ur scenen också.
*/
export function Scene() {
	/*
	  En ref till skeppets group. Vi skapar den HÄR, i föräldern, och skickar
	  den till både Ship (som fäster den på sin <group>) och CameraRig (som
	  läser skeppets position). Så kan två syskon-komponenter dela på samma
	  three.js-objekt utan att gå via React state.
	*/
	const shipRef = useRef<Group>(null);

	/*
	  Poolerna med asteroider och skott (se world.ts). Samma idé som shipRef:
	  de skapas här och delas mellan komponenterna som flyttar dem
	  (Asteroids, Bullets) och den som kollar kollisioner (GameLogic).
	*/
	const asteroidsRef = useRef(createAsteroidPool());
	const bulletsRef = useRef(createBulletPool());
	const particlesRef = useRef(createParticlePool());

	return (
		<>
			{/*
        Bakgrundsfärg. `attach="background"` betyder att färgen inte läggs
        till i scenen som ett objekt, utan sätts som en egenskap:
          scene.background = new THREE.Color('#05050f')
      */}
			<color attach="background" args={[SPACE_COLOR]} />

			{/*
        ── Dimma ──
        scene.fog = new THREE.Fog(färg, near, far)
        Objekt närmare än `near` syns helt, längre bort än `far` försvinner
        helt i dimfärgen, och däremellan tonas de gradvis.

        Asteroiderna skapas ~165 enheter från kameran, alltså precis i
        dimman. De "tonar fram" ur mörkret i stället för att plötsligt
        poppa upp – det ser mycket bättre ut! Färgen ska vara samma som
        bakgrunden, annars syns dimman som en grå vägg.
      */}
			<fog attach="fog" args={[SPACE_COLOR, 60, 160]} />

			{/*
        ── Ljus ──
        De flesta material (t.ex. meshStandardMaterial) är svarta utan ljus!
        Vi använder två vanliga typer:

        ambientLight: lyser lika mycket på allt, från alla håll. Ger inga
        skuggor eller djup, men gör att skuggsidorna inte blir helt svarta.

        directionalLight: som solen – parallella strålar från ett håll.
        Det är den som ger kuben ljusa och mörka sidor så att den ser 3D ut.
        Positionen anger bara RIKTNINGEN ljuset kommer ifrån (här: uppe till
        höger, framför), ljuset pekar mot origo.
      */}
			<ambientLight intensity={0.3} />
			<directionalLight position={[5, 5, 5]} intensity={3} color={"#c7e7f2"} />

			{/* Rymden runt omkring – se Starfield.tsx och Planet.tsx */}
			<Starfield />
			{/* <Planet /> */}

			{/* Spelarens skepp – se Ship.tsx */}
			<Ship shipRef={shipRef} />

			{/* Kameran som följer skeppet – se CameraRig.tsx */}
			<CameraRig shipRef={shipRef} />

			{/* Det som flyger – se Asteroids.tsx och Bullets.tsx */}
			<Asteroids asteroidsRef={asteroidsRef} shipRef={shipRef} />
			<Bullets bulletsRef={bulletsRef} shipRef={shipRef} />

			{/* Skärvor och gnistor – se Particles.tsx */}
			<Particles particlesRef={particlesRef} />

			{/* Tid och kollisioner. SIST, så att allt annat flyttats först. */}
			<GameLogic
				shipRef={shipRef}
				asteroidsRef={asteroidsRef}
				bulletsRef={bulletsRef}
				particlesRef={particlesRef}
			/>
		</>
	);
}
