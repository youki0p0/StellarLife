import { describe, expect, it } from "vitest";
import {
  MAX_SEATS,
  MIN_SEATS,
  canStart,
  createRoomState,
  roomReducer,
  seatForClient,
  type RoomAction,
  type RoomState,
} from "./room";

const HOST = "host-client";
const SEED = "test-seed";

let seatCounter = 0;
/** Deterministic-but-unique seat id generator. */
function sid(): string {
  seatCounter += 1;
  return `seat-${seatCounter}`;
}

function reduce(state: RoomState, ...actions: RoomAction[]): RoomState {
  return actions.reduce((s, a) => roomReducer(s, a), state);
}

/** A lobby with the host joined and ready, used to build start scenarios. */
function lobbyWithReadyHost(): { state: RoomState; hostSeatId: string } {
  const hostSeatId = sid();
  const state = reduce(
    createRoomState(HOST, SEED),
    { type: "JOIN", clientId: HOST, name: "ホスト", seatId: hostSeatId },
    { type: "TOGGLE_READY", seatId: hostSeatId },
  );
  return { state, hostSeatId };
}

describe("createRoomState", () => {
  it("starts in the lobby with the host set and no seats", () => {
    const state = createRoomState(HOST, SEED);
    expect(state.phase).toBe("lobby");
    expect(state.hostClientId).toBe(HOST);
    expect(state.seats).toHaveLength(0);
    expect(state.seed).toBe(SEED);
    expect(state.game).toBeNull();
  });
});

describe("JOIN", () => {
  it("adds a human seat owned by the client", () => {
    const id = sid();
    const state = roomReducer(createRoomState(HOST, SEED), {
      type: "JOIN",
      clientId: "c1",
      name: "アリス",
      seatId: id,
    });
    expect(state.seats).toHaveLength(1);
    const seat = state.seats[0];
    expect(seat.id).toBe(id);
    expect(seat.name).toBe("アリス");
    expect(seat.isCpu).toBe(false);
    expect(seat.ready).toBe(false);
    expect(seat.clientId).toBe("c1");
  });

  it("ignores a second JOIN from the same clientId (no duplicate)", () => {
    const first = roomReducer(createRoomState(HOST, SEED), {
      type: "JOIN",
      clientId: "c1",
      name: "アリス",
      seatId: sid(),
    });
    const second = roomReducer(first, {
      type: "JOIN",
      clientId: "c1",
      name: "アリス2",
      seatId: sid(),
    });
    expect(second).toBe(first);
    expect(second.seats).toHaveLength(1);
  });

  it("respects the MAX_SEATS cap of 8", () => {
    expect(MAX_SEATS).toBe(8);
    let state = createRoomState(HOST, SEED);
    for (let i = 0; i < MAX_SEATS; i += 1) {
      state = roomReducer(state, {
        type: "JOIN",
        clientId: `c${i}`,
        name: `p${i}`,
        seatId: sid(),
      });
    }
    expect(state.seats).toHaveLength(MAX_SEATS);
    const overflow = roomReducer(state, {
      type: "JOIN",
      clientId: "over",
      name: "extra",
      seatId: sid(),
    });
    expect(overflow).toBe(state);
    expect(overflow.seats).toHaveLength(MAX_SEATS);
  });
});

describe("TOGGLE_READY and RENAME", () => {
  it("TOGGLE_READY flips a seat's ready flag", () => {
    const id = sid();
    let state = roomReducer(createRoomState(HOST, SEED), {
      type: "JOIN",
      clientId: "c1",
      name: "アリス",
      seatId: id,
    });
    expect(state.seats[0].ready).toBe(false);
    state = roomReducer(state, { type: "TOGGLE_READY", seatId: id });
    expect(state.seats[0].ready).toBe(true);
    state = roomReducer(state, { type: "TOGGLE_READY", seatId: id });
    expect(state.seats[0].ready).toBe(false);
  });

  it("RENAME changes the name", () => {
    const id = sid();
    let state = roomReducer(createRoomState(HOST, SEED), {
      type: "JOIN",
      clientId: "c1",
      name: "アリス",
      seatId: id,
    });
    state = roomReducer(state, { type: "RENAME", seatId: id, name: "ボブ" });
    expect(state.seats[0].name).toBe("ボブ");
  });

  it("RENAME ignores an empty (whitespace-only) name", () => {
    const id = sid();
    let state = roomReducer(createRoomState(HOST, SEED), {
      type: "JOIN",
      clientId: "c1",
      name: "アリス",
      seatId: id,
    });
    state = roomReducer(state, { type: "RENAME", seatId: id, name: "   " });
    expect(state.seats[0].name).toBe("アリス");
  });
});

describe("ADD_CPU", () => {
  it("adds a cpu seat that is ready by default and has no clientId", () => {
    const state = roomReducer(createRoomState(HOST, SEED), {
      type: "ADD_CPU",
      seatId: sid(),
    });
    expect(state.seats).toHaveLength(1);
    const seat = state.seats[0];
    expect(seat.isCpu).toBe(true);
    expect(seat.ready).toBe(true);
    expect(seat.clientId).toBeNull();
  });

  it("respects the MAX_SEATS cap", () => {
    let state = createRoomState(HOST, SEED);
    for (let i = 0; i < MAX_SEATS; i += 1) {
      state = roomReducer(state, { type: "ADD_CPU", seatId: sid() });
    }
    expect(state.seats).toHaveLength(MAX_SEATS);
    const overflow = roomReducer(state, { type: "ADD_CPU", seatId: sid() });
    expect(overflow).toBe(state);
    expect(overflow.seats).toHaveLength(MAX_SEATS);
  });
});

describe("REMOVE_SEAT", () => {
  function setup() {
    const hostSeat = sid();
    const humanSeat = sid();
    const cpuSeat = sid();
    const state = reduce(
      createRoomState(HOST, SEED),
      { type: "JOIN", clientId: HOST, name: "ホスト", seatId: hostSeat },
      { type: "JOIN", clientId: "c2", name: "アリス", seatId: humanSeat },
      { type: "ADD_CPU", seatId: cpuSeat },
    );
    return { state, hostSeat, humanSeat, cpuSeat };
  }

  it("lets the host remove any seat", () => {
    const { state, humanSeat } = setup();
    const after = roomReducer(state, {
      type: "REMOVE_SEAT",
      seatId: humanSeat,
      byClientId: HOST,
    });
    expect(after.seats.some((s) => s.id === humanSeat)).toBe(false);
  });

  it("lets a non-host remove their own seat", () => {
    const { state, humanSeat } = setup();
    const after = roomReducer(state, {
      type: "REMOVE_SEAT",
      seatId: humanSeat,
      byClientId: "c2",
    });
    expect(after.seats.some((s) => s.id === humanSeat)).toBe(false);
  });

  it("lets a non-host remove a CPU seat", () => {
    const { state, cpuSeat } = setup();
    const after = roomReducer(state, {
      type: "REMOVE_SEAT",
      seatId: cpuSeat,
      byClientId: "c2",
    });
    expect(after.seats.some((s) => s.id === cpuSeat)).toBe(false);
  });

  it("does NOT let a non-host remove another human's seat", () => {
    const { state, hostSeat } = setup();
    const after = roomReducer(state, {
      type: "REMOVE_SEAT",
      seatId: hostSeat,
      byClientId: "c2",
    });
    expect(after).toBe(state);
    expect(after.seats.some((s) => s.id === hostSeat)).toBe(true);
  });
});

describe("canStart and START", () => {
  it("MIN_SEATS is 1", () => {
    expect(MIN_SEATS).toBe(1);
  });

  it("canStart is false with no seats", () => {
    expect(canStart(createRoomState(HOST, SEED))).toBe(false);
  });

  it("canStart is false while a human seat is not ready", () => {
    const id = sid();
    const state = roomReducer(createRoomState(HOST, SEED), {
      type: "JOIN",
      clientId: HOST,
      name: "ホスト",
      seatId: id,
    });
    expect(canStart(state)).toBe(false);
  });

  it("canStart is true once every non-cpu seat is ready", () => {
    const { state } = lobbyWithReadyHost();
    expect(canStart(state)).toBe(true);
  });

  it("START by the host transitions to playing and creates a matching game", () => {
    const { state, hostSeatId } = lobbyWithReadyHost();
    const cpuSeat = sid();
    const withCpu = roomReducer(state, { type: "ADD_CPU", seatId: cpuSeat });
    const started = roomReducer(withCpu, { type: "START", byClientId: HOST });
    expect(started.phase).toBe("playing");
    expect(started.game).not.toBeNull();
    const players = started.game!.players;
    expect(Object.keys(players)).toHaveLength(2);
    expect(players[hostSeatId]).toBeDefined();
    expect(players[hostSeatId].name).toBe("ホスト");
    expect(players[cpuSeat]).toBeDefined();
    expect(players[cpuSeat].isCpu).toBe(true);
  });

  it("ignores START from a non-host", () => {
    const { state } = lobbyWithReadyHost();
    const after = roomReducer(state, { type: "START", byClientId: "not-host" });
    expect(after).toBe(state);
    expect(after.phase).toBe("lobby");
  });

  it("ignores START when a human seat is unready", () => {
    const id = sid();
    const state = roomReducer(createRoomState(HOST, SEED), {
      type: "JOIN",
      clientId: HOST,
      name: "ホスト",
      seatId: id,
    });
    const after = roomReducer(state, { type: "START", byClientId: HOST });
    expect(after).toBe(state);
    expect(after.phase).toBe("lobby");
  });
});

describe("RESTART", () => {
  function playingState() {
    const { state, hostSeatId } = lobbyWithReadyHost();
    const cpuSeat = sid();
    const withCpu = roomReducer(state, { type: "ADD_CPU", seatId: cpuSeat });
    const started = roomReducer(withCpu, { type: "START", byClientId: HOST });
    return { started, hostSeatId, cpuSeat };
  }

  it("only the host can restart", () => {
    const { started } = playingState();
    const after = roomReducer(started, {
      type: "RESTART",
      byClientId: "not-host",
    });
    expect(after).toBe(started);
  });

  it("returns to the lobby, clears the game, and keeps seats", () => {
    const { started, hostSeatId, cpuSeat } = playingState();
    const after = roomReducer(started, { type: "RESTART", byClientId: HOST });
    expect(after.phase).toBe("lobby");
    expect(after.game).toBeNull();
    expect(after.seats).toHaveLength(2);
    const cpu = after.seats.find((s) => s.id === cpuSeat)!;
    const human = after.seats.find((s) => s.id === hostSeatId)!;
    expect(cpu.ready).toBe(true); // cpus stay ready
    expect(human.ready).toBe(false); // humans reset to not ready
  });
});

describe("GAME delegation", () => {
  function playing() {
    const { state, hostSeatId } = lobbyWithReadyHost();
    const started = roomReducer(state, { type: "START", byClientId: HOST });
    return { started, hostSeatId };
  }

  it("delegates a valid action to the engine and updates the game", () => {
    const { started } = playing();
    const game = started.game!;
    const current = game.turnOrder[game.currentTurnIndex];
    const after = roomReducer(started, {
      type: "GAME",
      action: { type: "ROLL", playerId: current },
    });
    expect(after).not.toBe(started);
    expect(after.game).not.toBe(game);
    // A roll either moved the player or produced a pending choice.
    const moved = after.game!.players[current].position > 0;
    const hasPending = after.game!.pending !== null;
    expect(moved || hasPending).toBe(true);
  });

  it("returns the same state for an invalid GAME action", () => {
    const { started } = playing();
    const game = started.game!;
    // An out-of-turn roll is a no-op in the engine.
    const notCurrent =
      game.turnOrder.find((id) => id !== game.turnOrder[game.currentTurnIndex]) ??
      "no-such-player";
    const after = roomReducer(started, {
      type: "GAME",
      action: { type: "ROLL", playerId: notCurrent },
    });
    expect(after).toBe(started);
  });

  it("ignores a GAME action while in the lobby", () => {
    const state = createRoomState(HOST, SEED);
    const after = roomReducer(state, {
      type: "GAME",
      action: { type: "ROLL", playerId: "anyone" },
    });
    expect(after).toBe(state);
  });
});

describe("seatForClient", () => {
  it("returns the seat owned by a clientId", () => {
    const id = sid();
    const state = roomReducer(createRoomState(HOST, SEED), {
      type: "JOIN",
      clientId: "c1",
      name: "アリス",
      seatId: id,
    });
    const seat = seatForClient(state, "c1");
    expect(seat).not.toBeNull();
    expect(seat!.id).toBe(id);
  });

  it("returns null for an unknown clientId", () => {
    const state = createRoomState(HOST, SEED);
    expect(seatForClient(state, "nobody")).toBeNull();
  });
});
