import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function FamilyTreePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;

  const member = await prisma.member.findFirst({
    where: { id, templeId: authUser.templeId, type: "DANKA" },
    include: {
      user: { select: { name: true } },
      deceasedPersons: { orderBy: { deathDate: "asc" } },
    },
  });

  if (!member) notFound();

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/admin/members/${id}`}
          className="text-sm text-stone-400 hover:text-stone-600 mb-2 inline-block"
        >
          ← {member.user.name}
        </Link>
        <h1 className="text-xl font-bold text-stone-800">家系図</h1>
        <p className="text-sm text-stone-500 mt-0.5">{member.familyName} 家</p>
      </div>

      {/* ツリー本体 */}
      <div className="flex flex-col items-center">
        {/* 家主ノード */}
        <div className="bg-amber-700 text-white rounded-xl px-8 py-4 text-center shadow min-w-[180px]">
          <p className="text-xs opacity-70 mb-0.5">檀家（家主）</p>
          <p className="font-bold text-lg">{member.user.name}</p>
          <p className="text-xs opacity-70 mt-0.5">{member.familyName} 家</p>
        </div>

        {member.deceasedPersons.length === 0 ? (
          <div className="mt-10 text-center text-stone-400">
            <p className="text-sm">登録された故人はいません</p>
            <Link
              href={`/admin/deceased/new?memberId=${id}`}
              className="mt-3 inline-block text-sm text-amber-700 hover:underline"
            >
              過去帳に追加する →
            </Link>
          </div>
        ) : (
          <>
            {/* 縦線：家主から分岐点へ */}
            <div className="w-px h-8 bg-stone-300" />

            {/* 故人ノード群 */}
            {member.deceasedPersons.length === 1 ? (
              /* 1名の場合：そのまま縦に繋げる */
              <DeceasedNode person={member.deceasedPersons[0]} />
            ) : (
              /* 複数の場合：横並びで分岐 */
              <div className="relative w-full">
                {/* 横線（分岐バー） */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-stone-300 w-[calc(100%-120px)]" />
                <div className="flex justify-center gap-4 flex-wrap pt-0">
                  {member.deceasedPersons.map((p) => (
                    <div key={p.id} className="flex flex-col items-center">
                      <div className="w-px h-8 bg-stone-300" />
                      <DeceasedNode person={p} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* 凡例・操作 */}
      <div className="mt-10 flex items-center justify-between text-xs text-stone-400 border-t border-stone-100 pt-4">
        <span>故人 {member.deceasedPersons.length}名</span>
        <div className="flex items-center gap-4">
          <Link
            href={`/admin/deceased/new?memberId=${id}`}
            className="text-amber-700 hover:underline font-medium"
          >
            ＋ 過去帳に追加する
          </Link>
          {member.deceasedPersons.length > 0 && (
            <Link
              href={`/admin/deceased?memberId=${id}`}
              className="text-stone-400 hover:underline"
            >
              一覧で管理する →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function DeceasedNode({
  person,
}: {
  person: {
    id: string;
    name: string;
    kaimyo: string | null;
    relationship: string | null;
    deathDate: Date | null;
    birthDate: Date | null;
    age: number | null;
    notes: string | null;
  };
}) {
  return (
    <div className="bg-white border-2 border-stone-200 rounded-xl p-4 text-center shadow-sm min-w-[140px] max-w-[200px]">
      {person.relationship && (
        <p className="text-xs text-stone-400 mb-1">{person.relationship}</p>
      )}
      <p className="font-semibold text-stone-800">{person.name}</p>
      {person.kaimyo && (
        <p className="text-xs text-amber-700 mt-1 italic">{person.kaimyo}</p>
      )}
      {person.deathDate && (
        <p className="text-xs text-stone-400 mt-1.5">
          {person.deathDate.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {person.age != null && ` 享年${person.age}歳`}
        </p>
      )}
      {!person.deathDate && person.age != null && (
        <p className="text-xs text-stone-400 mt-1.5">享年{person.age}歳</p>
      )}
    </div>
  );
}
