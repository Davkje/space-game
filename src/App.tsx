import { Canvas } from "@react-three/fiber";
import { Hud } from "./components/Hud";
import { CAMERA_DISTANCE, CAMERA_HEIGHT } from "./game/constants";
import { useGameStore } from "./game/gameStore";
import { Scene } from "./game/Scene";

/*
  App är toppen av vår komponent-träd.

  <Canvas> är kopplingen mellan React och three.js. Bakom kulisserna gör den
  ungefär det här, som du annars hade fått skriva själv i ren three.js:

    const renderer = new THREE.WebGLRenderer()              // ritar med GPU:n
    const scene    = new THREE.Scene()                      // "världen" som innehåller allt
    const camera   = new THREE.PerspectiveCamera(75, w / h) // ögat vi tittar genom
    document.body.appendChild(renderer.domElement)          // lägger in <canvas> i sidan

    function loop() {                                        // spel-loopen
      requestAnimationFrame(loop)                            // ~60 gånger per sekund
      renderer.render(scene, camera)                         // rita en bild (en "frame")
    }
    loop()

  Den lyssnar också på fönstrets storlek och uppdaterar kamerans
  bildförhållande (aspect ratio) när du ändrar storlek på fönstret.

  Allt som ligger INUTI <Canvas> är three.js-objekt, inte HTML.
  HTML (poäng, game over-skärm) ligger BREDVID <Canvas>, i <Hud />.
*/
export default function App() {
	/*
	  ── Omstart med `key` ──
	  `round` räknas upp varje gång man trycker "Spela igen".
	  När `key` på en komponent ändras ser React den som en HELT NY
	  komponent: den gamla tas bort och en ny skapas från början. Alla refs,
	  pooler och positioner nollställs då automatiskt – ett enkelt och
	  pålitligt sätt att starta om spelet.
	*/
	const round = useGameStore((s) => s.round);

	return (
		<>
			<Canvas
			// Kamerans STARTinställningar:
			// - position [x, y, z]: bakom och ovanför skeppet. Efter första
			//   framen tar CameraRig.tsx över och flyttar kameran varje frame,
			//   så det är där du ändrar kamerans läge numera (via constants.ts).
			// - fov (field of view): hur många grader kameran ser vertikalt.
			//   Högt värde = vidvinkel ("fisheye"), lågt = inzoomat (teleobjektiv).
			camera={{ position: [0, CAMERA_HEIGHT, CAMERA_DISTANCE], fov: 75 }}
		>
			<Scene key={round} />
		</Canvas>
			<Hud />
		</>
	);
}
