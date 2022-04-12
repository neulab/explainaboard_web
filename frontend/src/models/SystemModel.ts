import { System } from "../clients/openapi";
import moment, { Moment } from "moment";

/** same as System, but `created_at` is replaced with Moment to make it easier to use*/
export interface SystemModel extends Omit<System, "created_at"> {
  created_at: Moment;
}

/** construct a `SystemModel` from `System` */
export const newSystemModel = (system: System): SystemModel => {
  return {
    ...system,
    created_at: moment(system.created_at),
  };
};
