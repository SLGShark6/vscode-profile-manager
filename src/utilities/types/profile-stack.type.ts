import { Profile, OmitKey } from "@extension/utilities";

export type ProfileStack = {
   id: string,

   child?: ProfileStack
} & OmitKey<Profile, "children">;
