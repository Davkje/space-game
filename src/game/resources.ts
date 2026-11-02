import {
	DodecahedronGeometry,
	MeshStandardMaterial,
	OctahedronGeometry,
	TetrahedronGeometry,
} from "three";

/*
  resources.ts – geometrier och material som delas av många objekt.

  ── Varför här, utanför React? ──
  Alla stenar ser likadana ut (bara olika stora), och skräpet som flyger
  när en sten går sönder ska se ut som samma sten. Så både Asteroids.tsx
  och Particles.tsx vill använda SAMMA material.

  Genom att skapa dem en gång här, på "modulnivå", finns de så länge appen
  lever och kan importeras var som helst. Varje mesh pekar bara på dem –
  det sparar minne och gör det snabbare för grafikkortet.

  (Eftersom de aldrig tas bort behöver vi inte heller anropa dispose().)
*/

// ── Geometrier ──
// Alla har radie 1. Storleken styrs sedan med mesh.scale.

/** 12-sidig "tärning". Med flatShading ser den ut som en kantig sten. */
export const rockGeometry = new DodecahedronGeometry(1, 0);

/** 8 sidor, som en kristall. */
export const crystalGeometry = new OctahedronGeometry(1, 0);

/** 4 sidor – den enklaste 3D-formen. Perfekt för små skärvor. */
export const particleGeometry = new TetrahedronGeometry(1, 0);

// ── Material ──

export const rockMaterial = new MeshStandardMaterial({
	color: "#8a8580",
	roughness: 1,
	flatShading: true,
});

/*
  emissive = färg som materialet "sänder ut" själv, oavsett ljus.
  Det gör att kristallerna lyser lite och syns tydligt även på skuggsidan –
  spelaren ska direkt se vad som går att plocka upp.
*/
export const crystalMaterial = new MeshStandardMaterial({
	color: "#ff8a3d",
	emissive: "#ff5a00",
	emissiveIntensity: 0.8,
	roughness: 0.4,
	flatShading: true,
});
