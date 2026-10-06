import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATALOG = [
  {
    name: 'Toyota',
    models: [
      { name: 'Land Cruiser Prado', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'Land Cruiser 300', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'RAV4', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Camry', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Corolla', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Prius', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Hilux', category: 'SUV', defaultSeats: 5, defaultFuel: 'Diesel' },
      { name: 'Fortuner', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'HiAce', category: 'Van', defaultSeats: 14, defaultFuel: 'Diesel' },
      { name: 'Alphard', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'Vellfire', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'Yaris Cross', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Harrier', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Aqua', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'C-HR', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Corolla Cross', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Crown', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'GR Supra', category: 'Sports', defaultSeats: 2, defaultFuel: 'Petrol' },
      { name: 'bZ4X', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
    ],
  },
  {
    name: 'Mercedes-Benz',
    models: [
      { name: 'C-Class', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'E-Class', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'S-Class', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'GLC', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'GLE', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'GLS', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'G-Class (G63)', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'A-Class', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'CLA', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'EQE', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'EQS', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'V-Class', category: 'Van', defaultSeats: 8, defaultFuel: 'Diesel' },
      { name: 'AMG GT', category: 'Sports', defaultSeats: 2, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'BMW',
    models: [
      { name: '3 Series', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: '5 Series', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: '7 Series', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'X1', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'X3', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'X5', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'X7', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'M3 Competition', category: 'Sports', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'M5', category: 'Sports', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'i4', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'i5', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'i7', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'iX', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: '4 Series Gran Coupe', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Z4', category: 'Sports', defaultSeats: 2, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Audi',
    models: [
      { name: 'A4', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'A6', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'A8', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Q3', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Q5', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Q7', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'Q8', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'e-tron GT', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'RS6 Avant', category: 'Sports', defaultSeats: 5, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Honda',
    models: [
      { name: 'Civic', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Accord', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'CR-V', category: 'SUV', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'HR-V / Vezel', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Fit / Jazz', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'City', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'ZR-V', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Pilot', category: 'SUV', defaultSeats: 8, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Nissan',
    models: [
      { name: 'Patrol', category: 'Luxury', defaultSeats: 8, defaultFuel: 'Petrol' },
      { name: 'X-Trail', category: 'SUV', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'Qashqai', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Navara', category: 'SUV', defaultSeats: 5, defaultFuel: 'Diesel' },
      { name: 'Leaf', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Ariya', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'GT-R', category: 'Sports', defaultSeats: 4, defaultFuel: 'Petrol' },
      { name: 'Serena', category: 'Van', defaultSeats: 8, defaultFuel: 'Hybrid' },
    ],
  },
  {
    name: 'Tesla',
    models: [
      { name: 'Model 3', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Model Y', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Model S Plaid', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Model X', category: 'Electric', defaultSeats: 7, defaultFuel: 'Electric' },
      { name: 'Cybertruck', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
    ],
  },
  {
    name: 'Land Rover',
    models: [
      { name: 'Range Rover', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Range Rover Sport', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Range Rover Velar', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Range Rover Evoque', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Defender 110', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'Defender 90', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Discovery', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'Discovery Sport', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
    ],
  },
  {
    name: 'Porsche',
    models: [
      { name: '911 Carrera', category: 'Sports', defaultSeats: 4, defaultFuel: 'Petrol' },
      { name: 'Cayenne', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Macan', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Panamera', category: 'Luxury', defaultSeats: 4, defaultFuel: 'Hybrid' },
      { name: 'Taycan', category: 'Electric', defaultSeats: 4, defaultFuel: 'Electric' },
      { name: '718 Cayman', category: 'Sports', defaultSeats: 2, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Hyundai',
    models: [
      { name: 'Tucson', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Santa Fe', category: 'SUV', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'Ioniq 5', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Ioniq 6', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Elantra', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Sonata', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Staria', category: 'Van', defaultSeats: 9, defaultFuel: 'Diesel' },
      { name: 'Palisade', category: 'SUV', defaultSeats: 8, defaultFuel: 'Petrol' },
      { name: 'Creta', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Kia',
    models: [
      { name: 'Sportage', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Sorento', category: 'SUV', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'EV6', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'EV9', category: 'Electric', defaultSeats: 7, defaultFuel: 'Electric' },
      { name: 'Carnival', category: 'Van', defaultSeats: 8, defaultFuel: 'Diesel' },
      { name: 'K5', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Seltos', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Suzuki',
    models: [
      { name: 'Swift', category: 'Hatchback', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Alto', category: 'Hatchback', defaultSeats: 4, defaultFuel: 'Petrol' },
      { name: 'Wagon R', category: 'Hatchback', defaultSeats: 4, defaultFuel: 'Hybrid' },
      { name: 'Baleno', category: 'Hatchback', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Every', category: 'Mini van', defaultSeats: 4, defaultFuel: 'Petrol' },
      { name: 'Spacia Custom', category: 'Mini van', defaultSeats: 4, defaultFuel: 'Hybrid' },
      { name: 'Jimny', category: 'SUV', defaultSeats: 4, defaultFuel: 'Petrol' },
      { name: 'Grand Vitara', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Fronx', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Ertiga', category: 'Van', defaultSeats: 7, defaultFuel: 'Hybrid' },
    ],
  },
  {
    name: 'Bajaj',
    models: [
      { name: 'RE 4-Stroke (Tuk-Tuk)', category: 'Tuk', defaultSeats: 3, defaultFuel: 'Petrol' },
      { name: 'Maxima Cargo', category: 'Tuk', defaultSeats: 2, defaultFuel: 'Diesel' },
      { name: 'Qute', category: 'Tuk', defaultSeats: 4, defaultFuel: 'Petrol' },
      { name: 'Pulsar NS200', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
      { name: 'Pulsar 150', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
      { name: 'Discover 125', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
      { name: 'Platina 100', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'TVS',
    models: [
      { name: 'King Deluxe (Tuk-Tuk)', category: 'Tuk', defaultSeats: 3, defaultFuel: 'Petrol' },
      { name: 'King Duramax', category: 'Tuk', defaultSeats: 3, defaultFuel: 'Petrol' },
      { name: 'NTORQ 125', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
      { name: 'Apache RTR 200 4V', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
      { name: 'Jupiter 110', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Yamaha',
    models: [
      { name: 'FZ-S V3', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
      { name: 'RayZR 125 Fi', category: 'Bike', defaultSeats: 2, defaultFuel: 'Hybrid' },
      { name: 'YZF-R15 V4', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
      { name: 'MT-15', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
      { name: 'Aerox 155', category: 'Bike', defaultSeats: 2, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Mitsubishi',
    models: [
      { name: 'Montero Sport', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'Outlander', category: 'SUV', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'Pajero', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'L200 / Triton', category: 'SUV', defaultSeats: 5, defaultFuel: 'Diesel' },
      { name: 'Eclipse Cross', category: 'SUV', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'Xpander', category: 'Van', defaultSeats: 7, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Ford',
    models: [
      { name: 'Mustang GT', category: 'Sports', defaultSeats: 4, defaultFuel: 'Petrol' },
      { name: 'Mustang Mach-E', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Ranger Raptor', category: 'SUV', defaultSeats: 5, defaultFuel: 'Diesel' },
      { name: 'Everest', category: 'SUV', defaultSeats: 7, defaultFuel: 'Diesel' },
      { name: 'Explorer', category: 'SUV', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'F-150', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Bronco', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Lexus',
    models: [
      { name: 'RX 350 / 500h', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'LX 600', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Petrol' },
      { name: 'NX 350h', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'ES 300h', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'LS 500', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'GX 550', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Petrol' },
      { name: 'LM 350h', category: 'Luxury', defaultSeats: 4, defaultFuel: 'Hybrid' },
    ],
  },
  {
    name: 'Mazda',
    models: [
      { name: 'CX-5', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'CX-60', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'CX-90', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'Mazda 3', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Mazda 6', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'MX-5 Miata', category: 'Sports', defaultSeats: 2, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'Volkswagen',
    models: [
      { name: 'Golf GTI / R', category: 'Sports', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Tiguan', category: 'SUV', defaultSeats: 7, defaultFuel: 'Petrol' },
      { name: 'Touareg', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Diesel' },
      { name: 'Passat', category: 'Sedan', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'ID.4', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Transporter / Multivan', category: 'Van', defaultSeats: 8, defaultFuel: 'Diesel' },
      { name: 'Arteon', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Petrol' },
    ],
  },
  {
    name: 'BYD',
    models: [
      { name: 'Seal', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Atto 3', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Han', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Tang', category: 'Electric', defaultSeats: 7, defaultFuel: 'Electric' },
      { name: 'Dolphin', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'Sealion 7', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
    ],
  },
  {
    name: 'Volvo',
    models: [
      { name: 'XC90 Recharge', category: 'Luxury', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'XC60 Recharge', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
      { name: 'XC40 / EX40', category: 'Electric', defaultSeats: 5, defaultFuel: 'Electric' },
      { name: 'EX90', category: 'Electric', defaultSeats: 7, defaultFuel: 'Electric' },
      { name: 'S90', category: 'Luxury', defaultSeats: 5, defaultFuel: 'Hybrid' },
    ],
  },
  {
    name: 'Jeep',
    models: [
      { name: 'Wrangler Rubicon', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Grand Cherokee', category: 'SUV', defaultSeats: 7, defaultFuel: 'Hybrid' },
      { name: 'Gladiator', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
      { name: 'Compass', category: 'SUV', defaultSeats: 5, defaultFuel: 'Petrol' },
    ],
  },
];

const CATEGORIES = [
  { name: 'Bike', slug: 'bike', icon: 'two_wheeler', description: 'Motorcycles and scooters', displayOrder: 1 },
  { name: 'Tuk', slug: 'tuk', icon: 'electric_rickshaw', description: 'Three-wheeler auto rickshaws', displayOrder: 2 },
  { name: 'Mini van', slug: 'mini-van', icon: 'airport_shuttle', description: 'Compact passenger & cargo mini vans', displayOrder: 3 },
  { name: 'Hatchback', slug: 'hatchback', icon: 'directions_car', description: 'Compact city hatchbacks', displayOrder: 4 },
  { name: 'Sedan', slug: 'sedan', icon: 'directions_car', description: 'Standard 4-door passenger sedans', displayOrder: 5 },
  { name: 'SUV', slug: 'suv', icon: 'directions_car', description: 'Sport utility vehicles & 4x4s', displayOrder: 6 },
  { name: 'Luxury', slug: 'luxury', icon: 'star', description: 'Premium executive & luxury cars', displayOrder: 7 },
  { name: 'Electric', slug: 'electric', icon: 'electric_car', description: 'All-electric zero-emission vehicles', displayOrder: 8 },
  { name: 'Van', slug: 'van', icon: 'airport_shuttle', description: 'Full-size passenger and cargo vans', displayOrder: 9 },
  { name: 'Sports', slug: 'sports', icon: 'sports_motorsports', description: 'Sports cars & performance coupes', displayOrder: 10 },
];

async function main() {
  console.log('Seeding Vehicle Categories, Makes and Models...');
  
  let categoriesCount = 0;
  for (const cat of CATEGORIES) {
    await prisma.vehicleCategory.upsert({
      where: { name: cat.name },
      update: {
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon,
        description: cat.description,
        displayOrder: cat.displayOrder,
        isActive: true,
      },
    });
    categoriesCount++;
  }

  let makesCount = 0;
  let modelsCount = 0;

  for (const makeData of CATALOG) {
    const make = await prisma.vehicleMake.upsert({
      where: { name: makeData.name },
      update: {},
      create: { name: makeData.name },
    });
    makesCount++;

    for (const modelData of makeData.models) {
      await prisma.vehicleModel.upsert({
        where: {
          makeId_name: {
            makeId: make.id,
            name: modelData.name,
          },
        },
        update: {
          category: modelData.category,
          defaultSeats: modelData.defaultSeats,
          defaultFuel: modelData.defaultFuel,
        },
        create: {
          makeId: make.id,
          name: modelData.name,
          category: modelData.category,
          defaultSeats: modelData.defaultSeats,
          defaultFuel: modelData.defaultFuel,
        },
      });
      modelsCount++;
    }
  }

  console.log(`Successfully seeded ${categoriesCount} vehicle categories, ${makesCount} vehicle makes, and ${modelsCount} vehicle models.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
