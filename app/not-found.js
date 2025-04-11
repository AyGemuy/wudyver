"use client";
import React, { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const PageNotFound = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleBackClick = () => {
    setIsLoading(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-xl text-center p-10 border rounded-2xl shadow-2xl bg-card text-card-foreground">
        <div className="flex justify-center mb-6">
          <img src="/assets/images/all-img/404-2.svg" alt="404" className="w-48 drop-shadow-lg" />
        </div>
        <h2 className="text-3xl font-bold mb-4">Oops! Page Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't seem to exist. It may have been removed,
          renamed, or is temporarily unavailable.
        </p>
        <Link href="/analytics">
          <Button
            icon={isLoading ? "heroicons:arrow-path" : "heroicons:arrow-left"}
            text={isLoading ? "Back..." : "Back"}
            className="btn-dark w-full"
            isLoading={isLoading}
            disabled={isLoading}
            onClick={handleBackClick}
          />
        </Link>
        <div className="mt-6">
          <Badge variant="outline">Error Code: 404</Badge>
        </div>
      </Card>
    </div>
  );
};

export default PageNotFound;
