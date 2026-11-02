import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

/*
  SpinningCube – vårt första 3D-objekt.

  ── Mesh = Geometry + Material ──
  Allt synligt i three.js är i grunden en Mesh, som består av två delar:

    Geometry: FORMEN. En lista med hörnpunkter (vertices) och trianglar.
              boxGeometry, sphereGeometry, coneGeometry osv.
    Material: YTAN. Färg, hur den reagerar på ljus, genomskinlighet …

  I ren three.js skulle samma kub se ut så här:

    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const material = new THREE.MeshStandardMaterial({ color: 'hotpink' })
    const cube     = new THREE.Mesh(geometry, material)
    scene.add(cube)
*/
export function SpinningCube() {
	/*
    useRef ger oss en referens till det RIKTIGA three.js-objektet
    (en THREE.Mesh) som R3F skapar. Via den kan vi ändra position,
    rotation osv. direkt, utan att gå via React.
  */
	const meshRef = useRef<Mesh>(null);

	/*
    useState är OK här, eftersom färgen bara ändras när man klickar
    (sällan). React renderar om komponenten, och R3F uppdaterar materialet.

    VIKTIGT: Saker som ändras VARJE frame (rotationen nedan) ska INTE ligga
    i useState – då skulle React rendera om 60 gånger per sekund och
    spelet bli segt. Därför använder vi ref + useFrame för rotationen.
  */
	const [active, setActive] = useState(false);

	/*
    useFrame är spel-loopen. Funktionen körs en gång per frame, precis
    innan bilden ritas (~60 gånger per sekund, fler på 120 Hz-skärmar).

    `delta` = antal sekunder sedan förra framen (t.ex. 0.0166 vid 60 fps).
    Genom att multiplicera hastigheter med delta blir rörelsen lika snabb
    oavsett hur snabb datorn/skärmen är. Utan delta skulle kuben snurra
    dubbelt så fort på en 120 Hz-skärm!

    Hastighet här: 1 radian per sekund på X, 0.5 på Y.
    (En hel varv = 2π radianer ≈ 6.28, alltså ~6 sekunder per varv på X.)
  */
	useFrame((_state, delta) => {
		const mesh = meshRef.current;
		if (!mesh) return; // Kan vara null innan objektet har skapats

		mesh.rotation.x += delta * 1;
		mesh.rotation.y += delta * 0.5;
	});

	return (
		<mesh
			ref={meshRef}
			// position [x, y, z] – mitt i världen. Prova att ändra!
			position={[0, 0, 0]}
			// scale kan vara ett tal (alla axlar) eller [x, y, z]
			scale={active ? 2 : 1}
			// R3F har inbyggd "raycasting": den räknar ut vilket 3D-objekt
			// muspekaren träffar, så vi kan använda onClick som i vanlig HTML.
			onClick={() => setActive(!active)}
		>
			{/*
        args = argumenten till konstruktorn: new THREE.BoxGeometry(1, 1, 1)
        → bredd, höjd, djup. Barn-taggar "fäster" sig automatiskt på sin
        förälder: geometry → mesh.geometry, material → mesh.material.
      */}
			{/* <boxGeometry args={[1, 1, 1]} /> */}
			<coneGeometry args={[0.5, 1.5, 5]} />

			{/*
        meshStandardMaterial är ett "fysiskt baserat" material (PBR):
        det reagerar realistiskt på ljus. Prova att byta till
        meshBasicMaterial – då ignoreras ljuset och kuben ser platt ut.
      */}
			<meshStandardMaterial color={active ? "#ff6b9d" : "#4fc3f7"} />
		</mesh>
	);
}
