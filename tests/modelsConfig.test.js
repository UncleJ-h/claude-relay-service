const { CLAUDE_MODELS } = require('../config/models')

describe('models config', () => {
  it('places the newest Claude Opus models first', () => {
    expect(CLAUDE_MODELS.slice(0, 2)).toEqual([
      {
        value: 'claude-opus-4-8',
        label: 'Claude Opus 4.8'
      },
      {
        value: 'claude-opus-4-7',
        label: 'Claude Opus 4.7'
      }
    ])
  })

  it('keeps Claude Sonnet 4.6 near the top of Claude model options', () => {
    expect(CLAUDE_MODELS[3]).toEqual({
      value: 'claude-sonnet-4-6',
      label: 'Claude Sonnet 4.6'
    })
  })
})
