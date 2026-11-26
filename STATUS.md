Migration completed successfully. The app now uses mini KOSPI200 futures calculations:
- Contract value: 50,000 won/point
- Fee rate: 0.00185% per side
- Direction labels: 롱/숏
- All calculation logic updated in src/lib/futures.ts
- Migration 0004_mini_futures.sql applied
- All 81 tests pass