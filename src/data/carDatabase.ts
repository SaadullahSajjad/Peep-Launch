export const carDatabase: Record<string, string[]> = {
  Acura: ['ILX', 'Integra', 'MDX', 'RDX', 'RLX', 'TLX', 'ZDX', 'NSX'],
  'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale', '4C'],
  Audi: ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q3', 'Q4 e-tron', 'Q5', 'Q7', 'Q8', 'e-tron GT', 'TT', 'R8'],
  BMW: ['2 Series', '3 Series', '4 Series', '5 Series', '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'XM', 'Z4', 'i4', 'i5', 'i7', 'iX'],
  Buick: ['Enclave', 'Encore', 'Encore GX', 'Envision', 'Envista'],
  Cadillac: ['CT4', 'CT5', 'Escalade', 'XT4', 'XT5', 'XT6', 'Lyriq', 'Celestiq'],
  Chevrolet: ['Blazer', 'Bolt EV', 'Bolt EUV', 'Camaro', 'Colorado', 'Corvette', 'Equinox', 'Express', 'Malibu', 'Silverado 1500', 'Silverado 2500', 'Silverado 3500', 'Suburban', 'Tahoe', 'Trailblazer', 'Traverse', 'Trax'],
  Chrysler: ['300', 'Pacifica', 'Voyager'],
  Dodge: ['Challenger', 'Charger', 'Durango', 'Hornet'],
  Fiat: ['500e', '500X'],
  Ford: ['Bronco', 'Bronco Sport', 'Edge', 'Escape', 'Expedition', 'Explorer', 'F-150', 'F-250', 'F-350', 'Mustang', 'Mustang Mach-E', 'Maverick', 'Ranger', 'Transit'],
  GMC: ['Acadia', 'Canyon', 'Hummer EV', 'Sierra 1500', 'Sierra 2500', 'Sierra 3500', 'Terrain', 'Yukon', 'Yukon XL'],
  Genesis: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  Honda: ['Accord', 'Civic', 'CR-V', 'HR-V', 'Odyssey', 'Passport', 'Pilot', 'Prologue', 'Ridgeline'],
  Hyundai: ['Elantra', 'Ioniq 5', 'Ioniq 6', 'Kona', 'NEXO', 'Palisade', 'Santa Cruz', 'Santa Fe', 'Sonata', 'Tucson', 'Venue'],
  Infiniti: ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
  Jaguar: ['E-PACE', 'F-PACE', 'F-TYPE', 'I-PACE', 'XF'],
  Jeep: ['Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Grand Wagoneer', 'Renegade', 'Wrangler', 'Wagoneer'],
  Kia: ['Carnival', 'EV6', 'EV9', 'Forte', 'K5', 'Niro', 'Rio', 'Seltos', 'Sorento', 'Soul', 'Sportage', 'Stinger', 'Telluride'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'],
  Lexus: ['ES', 'GX', 'IS', 'LC', 'LS', 'LX', 'NX', 'RC', 'RX', 'RZ', 'TX', 'UX'],
  Lincoln: ['Aviator', 'Corsair', 'Nautilus', 'Navigator'],
  Lucid: ['Air'],
  Maserati: ['Ghibli', 'Grecale', 'Levante', 'MC20', 'Quattroporte', 'GranTurismo'],
  Mazda: ['CX-30', 'CX-5', 'CX-50', 'CX-90', 'Mazda3', 'MX-5 Miata'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'CLA', 'CLE', 'E-Class', 'EQB', 'EQE', 'EQS', 'G-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'S-Class', 'SL', 'GT'],
  Mini: ['Cooper', 'Countryman', 'Clubman'],
  Mitsubishi: ['Eclipse Cross', 'Mirage', 'Outlander', 'Outlander Sport'],
  Nissan: ['Altima', 'Ariya', 'Armada', 'Frontier', 'GT-R', 'Kicks', 'Leaf', 'Maxima', 'Murano', 'Pathfinder', 'Rogue', 'Sentra', 'Titan', 'Versa', 'Z'],
  Polestar: ['2', '3'],
  Porsche: ['718 Boxster', '718 Cayman', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  Ram: ['1500', '2500', '3500', 'ProMaster'],
  Rivian: ['R1S', 'R1T'],
  Subaru: ['Ascent', 'BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'WRX'],
  Tesla: ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  Toyota: ['4Runner', 'bZ4X', 'Camry', 'Corolla', 'Crown', 'GR86', 'Highlander', 'Grand Highlander', 'Land Cruiser', 'Prius', 'RAV4', 'Sequoia', 'Sienna', 'Supra', 'Tacoma', 'Tundra', 'Venza'],
  Volkswagen: ['Atlas', 'Atlas Cross Sport', 'Golf GTI', 'Golf R', 'ID.4', 'ID.Buzz', 'Jetta', 'Taos', 'Tiguan'],
  Volvo: ['C40', 'EX30', 'EX90', 'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90'],
}

export function getCarMakes(): string[] {
  return Object.keys(carDatabase).sort()
}

export function getCarModels(make: string): string[] {
  return carDatabase[make] || []
}

export function generateYears(): number[] {
  const currentYear = new Date().getFullYear()
  const years: number[] = []
  for (let i = currentYear; i >= 1995; i--) {
    years.push(i)
  }
  return years
}



