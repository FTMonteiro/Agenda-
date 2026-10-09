import bcrypt from "bcryptjs";
import { prisma } from "../src/config/database";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.upsert({
    where: { email: "owner@slotix.dev" },
    update: {},
    create: { name: "Ana Owner", email: "owner@slotix.dev", passwordHash, role: "OWNER" },
  });

  const employee = await prisma.user.upsert({
    where: { email: "employee@slotix.dev" },
    update: {},
    create: { name: "Bruno Barbeiro", email: "employee@slotix.dev", passwordHash, role: "EMPLOYEE" },
  });

  await prisma.user.upsert({
    where: { email: "customer@slotix.dev" },
    update: {},
    create: { name: "Carla Cliente", email: "customer@slotix.dev", passwordHash, role: "CUSTOMER" },
  });

  const business = await prisma.business.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      ownerId: owner.id,
      name: "Barbearia SLOTIX",
      description: "Barbearia de demonstração criada pelo seed.",
      address: "Rua Exemplo, 123, Lisboa",
      phone: "+351 900 000 000",
      category: "Barbearia",
      imageUrl: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70",
      latitude: 38.7223,
      longitude: -9.1393,
    },
  });

  const professional = await prisma.professional.upsert({
    where: { userId: employee.id },
    update: {},
    create: {
      businessId: business.id,
      userId: employee.id,
      bio: "Barbeiro sénior.",
      specialty: "Cortes clássicos e barba",
      imageUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
      active: true,
    },
  });

  await prisma.service.upsert({
    where: { id: "00000000-0000-0000-0000-000000000002" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000002",
      businessId: business.id,
      name: "Corte de cabelo",
      description: "Corte clássico com máquina e tesoura.",
      price: 15,
      duration: 30,
      category: "corte",
      imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035",
      active: true,
    },
  });

  // Monday-Friday 09:00-13:00 + 14:00-19:00, Saturday 09:00-13:00, closed Sunday.
  await prisma.businessHours.deleteMany({ where: { businessId: business.id } });
  await prisma.businessHours.createMany({
    data: [1, 2, 3, 4, 5].flatMap((dayOfWeek) => [
      { businessId: business.id, dayOfWeek, startMinute: 540, endMinute: 780 },
      { businessId: business.id, dayOfWeek, startMinute: 840, endMinute: 1140 },
    ]).concat([{ businessId: business.id, dayOfWeek: 6, startMinute: 540, endMinute: 780 }]),
  });

  console.log("Seed concluído:", { owner: owner.email, employee: employee.email, business: business.name, professional: professional.id });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
