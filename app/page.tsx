"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { RulesModal } from "@/components/RulesModal";
import { getSavedName, makeRoomCode, saveName } from "@/lib/clientId";
import { isOnline } from "@/lib/supabaseClient";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [online, setOnline] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    setName(getSavedName());
    setOnline(isOnline());
  }, []);

  function commitName() {
    saveName(name.trim() || "プレイヤー");
  }

  function create() {
    commitName();
    router.push(`/room/${makeRoomCode()}`);
  }

  function join() {
    const c = code.trim().toUpperCase();
    if (c.length < 4) return;
    commitName();
    router.push(`/room/${c}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-8 px-5 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-bold tracking-widest text-neon-cyan text-shadow-neon sm:text-3xl">
          STELLAR LIFE
        </h1>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-300">
          宇宙へ行く人生すごろく。
          <br />
          学校から始まり、軌道・月・火星・深宇宙へ。
          <br />
          最も伝説的な人生を歩んだ者が勝者。
        </p>
      </header>

      <section className="w-full space-y-5 rounded-lg border-2 border-grid bg-panel/80 p-5 shadow-neon">
        <label className="block space-y-2">
          <span className="text-[11px] text-neon-gold">プレイヤー名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitName}
            maxLength={12}
            placeholder="あなたの名前"
            className="w-full rounded border-2 border-grid bg-void px-3 py-2 text-sm text-slate-100 outline-none focus:border-neon-cyan"
          />
        </label>

        <Button variant="cyan" size="lg" fullWidth onClick={create}>
          新しいルームを作る
        </Button>

        <div className="flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ルームコード"
            className="flex-1 rounded border-2 border-grid bg-void px-3 py-2 text-sm tracking-widest text-slate-100 outline-none focus:border-neon-magenta"
          />
          <Button variant="magenta" size="md" onClick={join}>
            参加
          </Button>
        </div>
      </section>

      <p className="text-center text-[10px] leading-relaxed text-slate-500">
        1〜8人 / 1試合15〜30分
        <br />
        {online
          ? "オンライン対戦が有効です。コードを共有して招待しよう。"
          : "ローカルモード: この端末で全員プレイ + CPU。"}
      </p>

      <Button variant="violet" size="sm" onClick={() => setRulesOpen(true)}>
        遊び方
      </Button>

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}
