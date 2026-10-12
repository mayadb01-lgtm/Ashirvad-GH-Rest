// Login wale ki permission (/quick/me) — ek hi baar laao, kai jagah use karo (30 second tak yaad)
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

let cache = null; // { at, promise }
export const loadMe = () => {
  if (!cache || Date.now() - cache.at > 30000) {
    const promise = axios.get(`${import.meta.env.VITE_REACT_APP_SERVER_URL}/quick/me`).then(({ data }) => data.me);
    cache = { at: Date.now(), promise };
    promise.catch(() => (cache = null));
  }
  return cache.promise;
};

// undefined = abhi aa raha hai · null = login nahi / error · object = me
export const useMe = () => {
  const [me, setMe] = useState(undefined);
  useEffect(() => {
    let alive = true;
    loadMe()
      .then((m) => alive && setMe(m))
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, []);
  return me;
};

// Classic page: staff kaun si sabse purani date chun sakta hai (Super Admin ki di hui seema)
// Return: dayjs (seema) · undefined (koi seema nahi) · fallback (pata nahi chala)
export const staffMinDate = (me, fallback) => {
  if (!me) return fallback;
  if (me.isAdmin) return fallback; // Super user: pehle jaisa
  if (!me.allowedDates) return undefined; // "Any date"
  const ds = me.allowedDates.map((d) => dayjs(d, "DD-MM-YYYY")).filter((d) => d.isValid());
  return ds.length ? ds.reduce((a, b) => (b.isBefore(a) ? b : a)).startOf("day") : fallback;
};

// Classic page ka raasta → business
export const CLASSIC_MODULE = { "/hotel": "gh", "/restaurant": "rest", "/office": "office" };
