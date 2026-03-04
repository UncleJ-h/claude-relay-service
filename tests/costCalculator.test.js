// Mock logger to avoid noisy output during tests
jest.mock('../src/utils/logger', () => ({
  api: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  success: jest.fn(),
  database: jest.fn(),
  security: jest.fn()
}))

describe('CostCalculator - Pricing Fallback', () => {
  test('falls back to legacy pricing when pricingService returns no pricing (console model name)', () => {
    jest.isolateModules(() => {
      const pricingService = require('../src/services/pricingService')
      // Simulate "pricing not available" for pricingService.calculateCost()
      pricingService.pricingData = {}

      const CostCalculator = require('../src/utils/costCalculator')

      const usage = {
        input_tokens: 1000,
        output_tokens: 2000,
        cache_creation_input_tokens: 3000,
        cache_read_input_tokens: 4000,
        cache_creation: {
          ephemeral_5m_input_tokens: 1000,
          ephemeral_1h_input_tokens: 2000
        }
      }

      const result = CostCalculator.calculateCost(usage, 'anthropic/claude-opus-4.6')
      expect(result).toBeTruthy()
      expect(result.costs.total).toBeGreaterThan(0)
      expect(result.usage.cacheCreateTokens).toBeGreaterThan(0)
    })
  })
})

