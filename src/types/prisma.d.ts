import type { PrismaClient } from '@prisma/client'

declare module '@prisma/client' {
  interface PrismaClient {
    banner: {
      create: <T = any, TInclude extends Prisma.BannerInclude = never, TOrderBy extends Prisma.BannerOrderByWithRelation = never> (
        data: Prisma.BannerCreateArgs<T>,
      ) => Prisma.BannerGetPayload<T>
      findMany: <T = any, TInclude extends Prisma.BannerInclude = never, TOrderBy extends Prisma.BannerOrderByWithRelation = never> (
        args?: Prisma.BannerFindManyArgs<T>,
      ) => Prisma.BannerGetPayload<T>[]
      count: <T = any, TInclude extends Prisma.BannerInclude = never, TOrderBy extends Prisma.BannerOrderByWithRelation = never> (
        args?: Prisma.BannerCountArgs<T>,
      ) => Prisma.BannerCountGetPayload<T>
      findUnique: <T = any, TInclude extends Prisma.BannerInclude = never, TOrderBy extends Prisma.BannerOrderByWithRelation = never> (
        args: Prisma.BannerFindUniqueArgs<T>,
      ) => Prisma.BannerGetPayload<T> | null
      update: <T = any, TInclude extends Prisma.BannerInclude = never, TOrderBy extends Prisma.BannerOrderByWithRelation = never> (
        args: Prisma.BannerUpdateArgs<T>,
      ) => Prisma.BannerGetPayload<T>
      delete: <T = any, TInclude extends Prisma.BannerInclude = never, TOrderBy extends Prisma.BannerOrderByWithRelation = never> (
        args: Prisma.BannerDeleteArgs<T>,
      ) => Prisma.BannerGetPayload<T>
    }
  }
}