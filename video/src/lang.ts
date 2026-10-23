import { getInputProps } from "remotion";
import { ja } from "./i18n/ja";
import { setLang, tr, type Lang } from "./i18n";
import metaEn from "../public/shots/meta.json";
import metaJa from "../public/shots-ja/meta.json";

// The video renders in English or Japanese: npx remotion render ... --props='{"lang":"ja"}'.
// Everything that differs by language comes from here: on-screen text, screens, voice and timing.

export const LANG: Lang = (getInputProps() as { lang?: string }).lang === "ja" ? "ja" : "en";
setLang(LANG);

export const SHOTS = LANG === "ja" ? "shots-ja" : "shots";
export const VO = LANG === "ja" ? "vo-ja" : "vo";

type Rect = { x: number; y: number; w: number; h: number };
export const meta = (LANG === "ja" ? metaJa : metaEn) as { liveCanvas: Rect; rects?: Record<string, Rect | null> };

/** On-screen text made for the video; app wording comes from the app's own dictionary. */
const VIDEO_JA: Record<string, string> = {
  "Before the visit": "受診の前",
  "At the hospital": "病院で",
  "Drives assigned": "走行の割り当て",
  "The drives": "走行",
  "Review and sign": "確認と署名",
  "Her plan": "本人のプラン",
  "The question today": "いま直面している問い",
  "licensed drivers 65 and older in the U.S.": "アメリカの65歳以上の運転免許保有者",
  "Source: CDC, 2022 data": "出典：CDC（2022年のデータ）",
  "A few hundred": "数百人",
  "certified driver rehabilitation specialists for the whole country": "全米にいる、運転リハビリテーションの認定専門家",
  "The evidence is scattered": "情報がばらばら",
  "Doctor's notes": "医師の記録",
  Pharmacy: "薬局",
  "Eye exam": "眼科検査",
  "Decisions come late": "判断が遅れる",
  "On worry instead of evidence": "根拠ではなく、不安で決まってしまう",
  "Part of a doctor's visit": "受診の一部として",
  "Health record": "健康記録",
  "From HealthKey, by consent": "HealthKeyから、本人の同意で",
  "Her answers": "本人の回答",
  "In her own words": "本人の言葉で",
  "Simulator drives": "シミュレーター走行",
  "Chosen for her": "本人に合わせて選択",
  "One record": "一つの記録",
  "Every value keeps its source": "各項目に出典を明記",
  Clinician: "医療専門職",
  "Reviews and signs": "確認して署名",
  "One of four outcomes": "4つの結果のいずれか",
  "Connect her health record": "健康記録をつなぐ",
  "HealthKey gathers it from her doctors and pharmacy.": "HealthKeyが、かかりつけの医療機関や薬局から集めます。",
  "She chooses what to share": "共有範囲は本人が選ぶ",
  "Only her clinician and her doctor see it.": "閲覧できるのは、担当の医療専門職と主治医だけです。",
  "Four short questions": "4つの短い質問",
  "About how, when and where she drives.": "いつ、どこで、どのように運転しているか。",
  "Margaret has checked in": "マーガレットさんがチェックイン",
  "New sleep medicine can slow reactions": "新しい睡眠薬で反応が遅れる可能性",
  "Cataract, left eye": "左目の白内障",
  "Where most close calls happen": "ヒヤリとしやすい場面",
  "Each score appears as its drive finishes": "走行が終わるごとに、スコアが表示されます",
  "Margaret's health record": "マーガレットさんの健康記録",
  "Chosen by Dana Ruiz, with her reasons": "ダナ・ルイスが選択、理由付き",
  "What was measured, and the rule for each score": "測定した内容と、スコアの基準",
  "Simulator 1, the full session file": "シミュレーター1、セッションの全記録",
  "The clinician decides": "判断するのは医療専門職",
  Signed: "署名済み",
  "One part of Dana's decision": "ダナさんの判断材料のひとつ",
  "Explained in person first": "まず対面で説明",
  "Four outcomes, each with a plan": "4つの結果、それぞれにプラン",
  "No restriction now, and a re-test date.": "今は制限なし。再テストの時期も決まります。",
  "Daylight only or local roads, re-tested sooner.": "日中のみ・近所のみなど。再テストは早めに。",
  "Treat the cause, like a medication review, then re-test.": "薬の見直しなどで原因に対処し、再テスト。",
  "A plan for getting around, explained in person.": "移動手段のプランを、対面で説明。",
  "Many causes can be treated, so there's often a path back to driving.": "原因の多くは治療できるため、再び運転できるようになることも少なくありません。",
  Safeguards: "安全のための仕組み",
  "She controls what she shares": "共有する内容は本人が決める",
  "Records are never sold": "記録が販売されることはない",
  "Never reports to the DMV on its own": "免許当局に自ら報告することはない",
  "One clinician-signed plan for every older driver": "すべての高齢ドライバーに、医療専門職が署名した一つのプランを",
  "Powered by": "提供",
};

export const L = (en: string) => (LANG === "ja" ? (VIDEO_JA[en] ?? tr(en)) : en);

/** Every Japanese character the video can show, so the font's character ranges load before rendering. */
export const JA_TEXT = LANG === "ja" ? [...Object.values(VIDEO_JA), ...Object.values(ja)].join("") : "";
