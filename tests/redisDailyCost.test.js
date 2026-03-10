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

describe('Redis account daily cost', () => {
  const fs = jest.requireActual('fs')
  const path = jest.requireActual('path')
  const primaryPath = path.join(process.cwd(), 'data', 'model_pricing.json')
  const fallbackPath = path.join(
    process.cwd(),
    'resources',
    'model-pricing',
    'model_prices_and_context_window.json'
  )
  const pricingFilePath = fs.existsSync(primaryPath) ? primaryPath : fallbackPath
  const pricingData = JSON.parse(fs.readFileSync(pricingFilePath, 'utf8'))

  let redis
  let pricingService
  let originalClient

  const createPipeline = (results) => {
    const pipeline = {
      hgetall: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(results)
    }
    return pipeline
  }

  beforeEach(() => {
    jest.resetModules()
    pricingService = require('../src/services/pricingService')
    pricingService.pricingData = pricingData

    redis = require('../src/models/redis')
    originalClient = redis.client
  })

  afterEach(() => {
    redis.client = originalClient
  })

  it('counts cache-only model usage in getAccountDailyCost', async () => {
    const pipeline = createPipeline([
      [
        null,
        {
          inputTokens: '0',
          outputTokens: '0',
          cacheCreateTokens: '0',
          cacheReadTokens: '150000'
        }
      ]
    ])

    redis.client = {
      smembers: jest.fn().mockResolvedValue(['acct-1:claude-opus-4-6']),
      pipeline: jest.fn(() => pipeline)
    }

    const cost = await redis.getAccountDailyCost('acct-1')
    const expected = pricingService.calculateCost(
      {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 150000
      },
      'claude-opus-4-6'
    ).totalCost

    expect(cost).toBeCloseTo(expected, 10)
    expect(cost).toBeGreaterThan(0)
  })

  it('counts cache-only model usage in batchGetAccountDailyCost', async () => {
    const pipeline = createPipeline([
      [
        null,
        {
          inputTokens: '0',
          outputTokens: '0',
          cacheCreateTokens: '0',
          cacheReadTokens: '90000'
        }
      ]
    ])

    redis.client = {
      smembers: jest.fn().mockResolvedValue(['acct-2:claude-sonnet-4-6']),
      pipeline: jest.fn(() => pipeline)
    }

    const costMap = await redis.batchGetAccountDailyCost(['acct-2'])
    const expected = pricingService.calculateCost(
      {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 90000
      },
      'claude-sonnet-4-6'
    ).totalCost

    expect(costMap.get('acct-2')).toBeCloseTo(expected, 10)
    expect(costMap.get('acct-2')).toBeGreaterThan(0)
  })
})
