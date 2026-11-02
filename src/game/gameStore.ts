import { create } from "zustand";
import { GAME_DURATION, INVULNERABLE_TIME, START_LIVES } from "./constants";

/*
  gameStore – spelets gemensamma tillstånd: tid, liv, poäng och fas.

  ── Problemet ──
  Två helt olika delar av appen behöver samma data:
    - 3D-världen (inne i <Canvas>): måste veta om spelet pågår, och
      räkna ner tiden och dra liv vid krockar.
    - HUD:en (vanlig HTML utanför <Canvas>): ska VISA tid, liv och poäng.
  De är inte förälder/barn till varandra, så props räcker inte smidigt.

  ── Lösningen: zustand ──
  zustand är ett litet bibliotek för "global state". `create` ger oss en
  hook, useGameStore, som kan användas på två sätt:

    1. I React-komponenter (HUD:en):
         const lives = useGameStore((s) => s.lives)
       Komponenten renderas om NÄR – och bara när – `lives` ändras.
       Funktionen (s) => s.lives kallas en "selector".

    2. I spel-loopen (useFrame), UTAN att rendera om något:
         const { phase } = useGameStore.getState()
       getState() läser bara nuvarande värden. Perfekt för kod som körs
       60 gånger per sekund.
*/

/*
  Spelets faser – en enkel "tillståndsmaskin":

    ready ──(börjar styra)──▶ playing ──(tiden ute)──▶ won
      ▲                          │
      │                          └──(slut på liv)───▶ lost
      └──────────(Spela igen)──────────────────────────┘

  ready   = startmenyn visas, inga asteroider, timern står still
  playing = rundan pågår
  won     = klarade hela tiden
  lost    = slut på liv
*/
export type GamePhase = "ready" | "playing" | "won" | "lost";

type GameState = {
	phase: GamePhase;
	/** Sekunder som spelet har pågått. */
	elapsed: number;
	lives: number;
	score: number;
	/** Tidpunkt (i `elapsed`-sekunder) när skeppet senast träffades. */
	lastHitAt: number;
	/**
	 * Räknas upp vid varje omstart. App.tsx använder den som `key` på
	 * scenen, så att hela 3D-världen skapas på nytt från början.
	 */
	round: number;

	// ── Actions: funktioner som ändrar tillståndet ──
	start: () => void;
	tick: (delta: number) => void;
	shipHit: () => void;
	addScore: (points: number) => void;
	restart: () => void;
};

/** Startvärdena – återanvänds vid omstart. */
const initialState = {
	phase: "ready" as GamePhase,
	elapsed: 0,
	lives: START_LIVES,
	score: 0,
	// Långt bak i tiden, så att skeppet inte är osårbart vid start.
	lastHitAt: -Infinity,
};

/*
  create((set, get) => ({ ... })) bygger storen.
    set({ ... }) – ändrar en eller flera egenskaper (resten lämnas orörda)
                   och meddelar alla komponenter som lyssnar.
    get()        – läser nuvarande tillstånd inifrån en action.
*/
export const useGameStore = create<GameState>((set, get) => ({
	...initialState,
	round: 0,

	/** Startar rundan. Anropas från Ship.tsx när spelaren börjar styra. */
	start: () => {
		if (get().phase === "ready") set({ phase: "playing" });
	},

	/** Körs varje frame från GameLogic.tsx: räknar upp tiden. */
	tick: (delta) => {
		const { phase, elapsed } = get();
		if (phase !== "playing") return;

		const next = elapsed + delta;
		if (next >= GAME_DURATION) {
			// Klarade hela tiden – vinst!
			set({ elapsed: GAME_DURATION, phase: "won" });
		} else {
			set({ elapsed: next });
		}
	},

	/** Skeppet krockade med en asteroid. */
	shipHit: () => {
		const { phase, lives, elapsed } = get();
		if (phase !== "playing") return;

		const remaining = lives - 1;
		set({
			lives: remaining,
			lastHitAt: elapsed,
			phase: remaining <= 0 ? "lost" : "playing",
		});
	},

	addScore: (points) => set({ score: get().score + points }),

	/** Tillbaka till startmenyn ("ready") med en helt ny värld. */
	restart: () => set({ ...initialState, round: get().round + 1 }),
}));

/*
  Hjälpfunktion: är skeppet osårbart just nu (blinkar efter en krock)?
  Tar state som argument så att den funkar både med getState() och
  inifrån andra funktioner.
*/
export function isInvulnerable(state: Pick<GameState, "elapsed" | "lastHitAt">) {
	return state.elapsed - state.lastHitAt < INVULNERABLE_TIME;
}
