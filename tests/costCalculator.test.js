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

  test('uses priority pricing when serviceTier is priority and model supports it', () => {
    jest.isolateModules(() => {
      const pricingService = require('../src/services/pricingService')
      pricingService.pricingData = {
        'gpt-5.4': {
          litellm_provider: 'openai',
          supports_service_tier: true,
          input_cost_per_token: 0.000001,
          output_cost_per_token: 0.000002,
          cache_read_input_token_cost: 0.0000001,
          input_cost_per_token_priority: 0.000003,
          output_cost_per_token_priority: 0.000004,
          cache_read_input_token_cost_priority: 0.0000003
        }
      }

      const CostCalculator = require('../src/utils/costCalculator')

      const usage = {
        input_tokens: 1000,
        output_tokens: 1000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 1000
      }

      const standard = CostCalculator.calculateCost(usage, 'gpt-5.4')
      const priority = CostCalculator.calculateCost(usage, 'gpt-5.4', 'priority')

      expect(priority.costs.total).toBeGreaterThan(standard.costs.total)
      expect(priority.pricing.input).toBe(3)
      expect(priority.pricing.output).toBe(4)
      expect(priority.pricing.cacheRead).toBe(0.3)
    })
  })
})
