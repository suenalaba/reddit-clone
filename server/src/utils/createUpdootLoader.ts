import DataLoader from "dataloader";
import { Updoot } from "../entities/Updoot";


//pass in [{postId: 5, userId: 10}]
// we load and return {postId: 5, userId: 10, value: 1}
//
export const createUpdootLoader = () => 
  new DataLoader<{postId: number, userId: number}, Updoot | null>(
    //define batch all the call into a single sql statement
    async (keys) => {
    const updoots = await Updoot.findByIds(keys as any); //type orm can handle composite keys //can be replaced with custom sql
    const updootIdsToUpdoot: Record<string, Updoot> = {}; //key is joint of user id and post id

    updoots.forEach((updoot) => {
      updootIdsToUpdoot[`${updoot.userId}|${updoot.postId}`] = updoot;
    });

    return keys.map(
      (key) => updootIdsToUpdoot[`${key.userId}|${key.postId}`]
    );
  }
);