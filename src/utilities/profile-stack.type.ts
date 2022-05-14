import { Profile } from "@extension/utilities";

export type ProfileStack = {
   id: string,

   child?: ProfileStack
} & Omit<Profile, "children">;
