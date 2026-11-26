export default {
  worker: {
    name: 'memoir',
    main: 'worker/index.mjs',
    compatibilityDate: '2026-11-26',
    assets: {
      directory: 'app/dist',
      binding: 'ASSETS',
      not_found_handling: 'single-page-application',
      run_worker_first: ['/api/*'],
    },
    ai: {
      binding: 'AI',
    },
    ratelimits: [
      {
        name: 'COMPOSE_LIMITER',
        namespace_id: '1001',
        simple: {
          limit: 4,
          period: 60,
        },
      },
      {
        name: 'REWRITE_LIMITER',
        namespace_id: '1002',
        simple: {
          limit: 12,
          period: 60,
        },
      },
      {
        name: 'GLOBAL_AI_LIMITER',
        namespace_id: '1003',
        simple: {
          limit: 30,
          period: 60,
        },
      },
    ],
    observability: {
      enabled: true,
      traces: {
        enabled: true,
      },
    },
  },
}
