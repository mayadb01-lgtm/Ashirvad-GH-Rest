import { useDispatch, useSelector } from "react-redux";

// Use Throughout the App Instead of plain useDispatch and useSelector
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
