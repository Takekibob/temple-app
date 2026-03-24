import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import NewReservationClient from "./NewReservationClient";

export default async function NewReservationPage() {
  const authUser = await getAuthUser();
  if (!authUser?.member) return null;

  const deceasedPersons = await prisma.deceasedPerson.findMany({
    where: { memberId: authUser.member.id },
    select: { id: true, name: true, relationship: true },
    orderBy: { name: "asc" },
  });

  return <NewReservationClient deceasedPersons={deceasedPersons} />;
}
