import React from 'react';
import type { NextPageContext } from 'next';

function ErrorPage({ statusCode }: { statusCode?: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full border rounded-lg p-6 text-center">
        <h1 className="text-2xl font-bold mb-2">حدث خطأ غير متوقع</h1>
        <p className="text-sm text-muted-foreground mb-4">
          {statusCode ? `الخطأ رقم ${statusCode}` : 'حدث خطأ على الواجهة'} — الرجاء المحاولة مرة أخرى.
        </p>
        <a href="/" className="inline-flex items-center justify-center rounded-md bg-primary text-white px-4 py-2 text-sm font-medium">العودة للصفحة الرئيسية</a>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode } as any;
};

export default ErrorPage;
