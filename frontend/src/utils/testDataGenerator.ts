/**
 * Test data generator utility
 * Generates random user data for development and testing
 */

const FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Quinn',
  'Blake', 'Cameron', 'Drew', 'Ellis', 'Finley', 'Hayden', 'Jamie', 'Kai',
  'Logan', 'Noah', 'Parker', 'River', 'Sage', 'Skylar', 'Tyler', 'Zoe',
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason',
  'Isabella', 'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander', 'Amelia',
]

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
]

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function generateRandomPassword(): string {
  const length = 12
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lowercase = 'abcdefghijklmnopqrstuvwxyz'
  const numbers = '0123456789'
  const symbols = '!@#$%^&*'
  const allChars = uppercase + lowercase + numbers + symbols

  // Ensure at least one of each type
  let password = ''
  password += getRandomElement(uppercase.split(''))
  password += getRandomElement(lowercase.split(''))
  password += getRandomElement(numbers.split(''))
  password += getRandomElement(symbols.split(''))

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += getRandomElement(allChars.split(''))
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

export interface RandomUserData {
  email: string
  username: string
  first_name: string
  last_name: string
  password: string
  password_confirm: string
}

/**
 * Generate random user data for testing
 */
export function generateRandomUserData(): RandomUserData {
  const firstName = getRandomElement(FIRST_NAMES)
  const lastName = getRandomElement(LAST_NAMES)
  const randomNum = Math.floor(Math.random() * 10000)
  const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randomNum}`
  const email = `${username}@example.com`
  const password = generateRandomPassword()

  return {
    email,
    username,
    first_name: firstName,
    last_name: lastName,
    password,
    password_confirm: password,
  }
}

