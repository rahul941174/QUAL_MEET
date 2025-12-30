import {z} from "zod";

export const IceServerQuerySchema=z.object({
    roomId:z.string().min(1,"roomId id required"),
});

export type IceServerQueryDTO=z.infer<typeof IceServerQuerySchema>;