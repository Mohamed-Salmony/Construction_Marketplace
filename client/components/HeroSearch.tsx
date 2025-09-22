import { Search, Filter } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { RouteContext } from "./Router";
import { useTranslation } from "../hooks/useTranslation";
import { useState } from "react";

export default function HeroSearch({ setSearchFilters, setCurrentPage }: Partial<RouteContext>) {
  const { t, locale } = useTranslation();
  const [term, setTerm] = useState("");

  return (
    <section
      className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      {/* Background image overlay */}
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="absolute inset-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1562492855-1c6e20372f61?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWNoYW5pYyUyMHdvcmtpbmclMjBnYXJhZ2UlMjBhdXRvbW90aXZlfGVufDF8fHx8MTc1NDA2Mzg3Mnww&ixlib=rb-4.1.0&q=80&w=1080"
          alt={t("workshopBackground")}
          className="w-full h-full object-cover opacity-20"
          priority={true}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Welcome message */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              {t("welcomeToAlAref")}
            </h1>
            <p className="text-xl md:text-2xl mb-2 opacity-90">
              {t("largestStore")}
            </p>
            <p className="text-lg opacity-80">{t("qualityPricesService")}</p>
          </div>

          {/* Search section */}
          <div className="bg-white p-6 rounded-2xl shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {t("searchForPart")}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
              <div className="relative">
                <Input
                  placeholder={t("searchPlaceholder")}
                  className="pr-12 text-right"
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                />
                <Search className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-md hover:shadow-lg focus-visible:ring-blue-400"
                onClick={() => {
                  setSearchFilters && setSearchFilters({ term });
                  setCurrentPage && setCurrentPage("products");
                }}
              >
                <Search className="w-5 h-5 ml-2" />
                {t("search")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 border-gray-300 bg-white text-gray-900 hover:bg-gray-100"
                onClick={() => {
                  setSearchFilters && setSearchFilters({ term });
                  setCurrentPage && setCurrentPage("products");
                }}
              >
                <Filter className="w-5 h-5 ml-2" />
                {t("advancedSearch")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
