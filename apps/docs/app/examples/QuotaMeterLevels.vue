<template>
  <div class="flex flex-col gap-3 w-full max-w-sm">
    <ZQuotaMeter :used="3.2" :quota="10" />
    <ZQuotaMeter :used="8.6" :quota="10" />
    <ZQuotaMeter :used="10.4" :quota="10" size="lg" />
  </div>
</template>
