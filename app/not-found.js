"use client"
import { useState } from "react"
import Link from "next/link"
import Card from "@/components/ui/Card"
import Button from "@/components/ui/Button"
import Badge from "@/components/ui/Badge"

const PageNotFound = () => {
  const [isLoading, setIsLoading] = useState(false)

  const handleBackClick = () => {
    setIsLoading(true)
  }

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-2 py-6">
      <Card
        bodyClass="relative p-4 h-full overflow-hidden text-center"
        className="w-full max-w-md p-6 border rounded-2xl shadow-lg bg-card text-card-foreground"
      >
        <div className="flex justify-center mb-6">
          <img src="/assets/images/all-img/404-2.svg" alt="404" className="w-48 drop-shadow-lg" />
        </div>
        <h2 className="text-3xl font-bold mb-4 text-center">Oops! Page Not Found</h2>
        <p className="text-muted-foreground mb-6 text-center">
          The page you're looking for doesn't seem to exist. It may have been removed, renamed, or is temporarily
          unavailable.
        </p>
        <Link href="/analytics" className="block">
          <Button
            icon={isLoading ? "heroicons:arrow-path" : "heroicons:arrow-left"}
            text={isLoading ? "Back..." : "Back"}
            className="btn-dark w-full"
            isLoading={isLoading}
            disabled={isLoading}
            onClick={handleBackClick}
          />
        </Link>
        <div className="mt-6 flex justify-center">
          <Badge variant="outline">Error Code: 404</Badge>
        </div>
      </Card>
    </div>
  )
}

export default PageNotFound
