import {
  GraduationCap,
  Heart,
  HeartPulse,
  Leaf,
  LifeBuoy,
  PawPrint,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { categoryDefinitions } from "../../shared/catalog.ts";
import { t } from "./i18n";

const icons = {
  eco: Leaf,
  social: Heart,
  animals: PawPrint,
  events: Users,
  education: GraduationCap,
  sports: Trophy,
  medical: HeartPulse,
  rescue: LifeBuoy,
};
export const getCategories = () => [
  { id: "all", label: t("Все направления"), icon: Sparkles },
  ...categoryDefinitions.map((category) => ({
    ...category,
    label: t(category.label),
    icon: icons[category.id],
  })),
];
