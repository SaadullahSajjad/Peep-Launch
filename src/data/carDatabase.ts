export const carDatabase: Record<string, string[]> = {
  Audi: ['A3', 'A4', 'Q5', 'Q7', 'RS6'],
  BMW: ['3 Series', '5 Series', 'X3', 'X5', 'X6'],
  Ford: ['F-150', 'Focus', 'Mustang', 'Explorer'],
  Honda: ['Civic', 'Accord', 'CR-V', 'Pilot'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
  Toyota: ['Corolla', 'Camry', 'RAV4', 'Tacoma'],
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



